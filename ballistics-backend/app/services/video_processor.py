"""Main video processing pipeline."""

import asyncio
import json
import logging
import tempfile
from pathlib import Path
from typing import Callable, Optional
import os

import httpx
import cv2
import numpy as np

from app.config import get_settings
from app.services.ball_detector import BallDetector
from app.services.ball_tracker import BallTracker
from app.services.depth_estimator import DepthEstimator
from app.core.geometry import Camera, project_to_3d
from app.core.physics import compute_trajectory_metrics

logger = logging.getLogger(__name__)

ProgressCallback = Callable[[float, str], None]


class VideoProcessor:
    """Main video processing pipeline for trajectory extraction."""

    def __init__(self):
        """Initialize processor with ML models."""
        settings = get_settings()
        self.detector = BallDetector(
            model_path=settings.yolo_model,
            confidence_threshold=settings.detection_confidence,
        )
        self.tracker = BallTracker(
            track_threshold=settings.tracking_confidence,
        )
        self.depth_estimator: Optional[DepthEstimator] = None
        self.max_frames = settings.max_frames

    def _get_depth_estimator(self) -> DepthEstimator:
        """Lazy load depth estimator (heavy model)."""
        if self.depth_estimator is None:
            settings = get_settings()
            self.depth_estimator = DepthEstimator(
                model_name=settings.depth_model,
            )
        return self.depth_estimator

    async def process_video(
        self,
        video_url: str,
        video_info: dict,
        calibration: Optional[dict],
        progress_callback: Optional[ProgressCallback] = None,
    ) -> dict:
        """
        Process a video and extract 3D trajectory.

        Args:
            video_url: URL to download video from
            video_info: Dict with flywheelRpm, hoodAngle, frameRate, etc.
            calibration: Camera calibration dict or None
            progress_callback: Async callback for progress updates

        Returns:
            Trajectory dict for Convex API
        """

        async def report_progress(progress: float, message: str):
            if progress_callback:
                await progress_callback(progress, message)

        await report_progress(0, "Downloading video...")

        # Download video to temp file
        async with httpx.AsyncClient() as client:
            response = await client.get(video_url, timeout=120.0)
            response.raise_for_status()

        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            f.write(response.content)
            video_path = f.name

        try:
            await report_progress(5, "Extracting frames...")

            # Open video
            cap = cv2.VideoCapture(video_path)
            fps = cap.get(cv2.CAP_PROP_FPS) or video_info.get("frameRate", 30)
            raw_frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

            # Handle invalid frame count (common with WebM files)
            if raw_frame_count <= 0 or raw_frame_count > 1e9:
                # Estimate from duration if available, otherwise use max_frames
                duration = video_info.get("duration")
                if duration and duration > 0:
                    total_frames = int(duration * fps)
                else:
                    total_frames = self.max_frames
                logger.warning(
                    f"Invalid frame count ({raw_frame_count}), estimating {total_frames} frames"
                )
            else:
                total_frames = int(raw_frame_count)

            logger.info(
                f"Video: {total_frames} frames at {fps} fps, {width}x{height}"
            )

            # Limit frames
            total_frames = min(total_frames, self.max_frames)

            # Setup camera model
            camera = Camera(
                width=width,
                height=height,
                calibration=calibration,
            )

            await report_progress(10, "Detecting ball...")

            # Process frames
            detections = []
            frame_idx = 0

            while frame_idx < total_frames:
                ret, frame = cap.read()
                if not ret:
                    break

                # Detect ball in frame
                detection = self.detector.detect(frame)
                if detection is not None:
                    detection["frame"] = frame_idx
                    detection["time"] = frame_idx / fps
                    detections.append(detection)

                frame_idx += 1

                # Report progress (10-50%)
                if frame_idx % 50 == 0:
                    progress = 10 + (frame_idx / total_frames) * 40
                    await report_progress(
                        progress, f"Detecting ball in frame {frame_idx}/{total_frames}"
                    )

            cap.release()

            if len(detections) < 5:
                return self._create_invalid_trajectory(
                    total_frames,
                    len(detections),
                    "Not enough ball detections (need at least 5)",
                )

            await report_progress(50, "Tracking ball...")

            # Track ball across frames
            tracks = self.tracker.track(detections)

            if not tracks or len(tracks[0]) < 5:
                return self._create_invalid_trajectory(
                    total_frames,
                    len(detections),
                    "Failed to track ball consistently",
                )

            # Get longest track
            main_track = max(tracks, key=len)

            await report_progress(60, "Estimating depth...")

            # Estimate depth for key frames (subsample for speed)
            depth_frames_indices = self._select_key_frames(main_track, max_frames=20)

            # Reopen video for depth estimation
            cap = cv2.VideoCapture(video_path)
            depth_estimator = self._get_depth_estimator()
            depths = {}

            for i, det in enumerate(main_track):
                if det["frame"] in depth_frames_indices:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, det["frame"])
                    ret, frame = cap.read()
                    if ret:
                        depth_map = depth_estimator.estimate(frame)
                        # Get depth at ball center
                        cx, cy = int(det["center_x"]), int(det["center_y"])
                        # Use region around center
                        region = depth_map[
                            max(0, cy - 10) : min(height, cy + 10),
                            max(0, cx - 10) : min(width, cx + 10),
                        ]
                        if region.size > 0:
                            depths[det["frame"]] = float(np.median(region))

                if i % 5 == 0:
                    progress = 60 + (i / len(main_track)) * 20
                    await report_progress(progress, f"Estimating depth...")

            cap.release()

            await report_progress(80, "Computing 3D trajectory...")

            # Interpolate depths for all frames
            depth_array = self._interpolate_depths(main_track, depths)

            # Project to 3D
            positions_3d = []
            for i, det in enumerate(main_track):
                x_3d, y_3d, z_3d = project_to_3d(
                    pixel_x=det["center_x"],
                    pixel_y=det["center_y"],
                    depth=depth_array[i],
                    camera=camera,
                )
                positions_3d.append(
                    {
                        "frame": det["frame"],
                        "time": det["time"],
                        "x": float(x_3d),
                        "y": float(y_3d),
                        "z": float(z_3d),
                        "confidence": float(det["confidence"]),
                    }
                )

            await report_progress(90, "Computing metrics...")

            # Compute trajectory metrics
            metrics = compute_trajectory_metrics(positions_3d)

            # Quality assessment
            avg_confidence = np.mean([p["confidence"] for p in positions_3d])
            is_valid = (
                avg_confidence > 0.5
                and len(positions_3d) >= 10
                and metrics.get("max_height", 0) > 0.1
            )

            quality_score = min(1.0, avg_confidence * (len(positions_3d) / 50))

            await report_progress(100, "Complete")

            return {
                "positions": json.dumps(positions_3d),
                "frameCount": total_frames,
                "detectedFrameCount": len(positions_3d),
                "averageConfidence": float(avg_confidence),
                "launchAngle": metrics.get("launch_angle"),
                "launchSpeed": metrics.get("launch_speed"),
                "maxHeight": metrics.get("max_height"),
                "horizontalDistance": metrics.get("horizontal_distance"),
                "flightTime": metrics.get("flight_time"),
                "isValid": is_valid,
                "qualityScore": float(quality_score),
                "qualityNotes": None if is_valid else "Low quality trajectory",
            }

        finally:
            # Cleanup temp file
            try:
                os.unlink(video_path)
            except Exception:
                pass

    def _select_key_frames(self, track: list, max_frames: int = 20) -> set:
        """Select key frames for depth estimation."""
        if len(track) <= max_frames:
            return {d["frame"] for d in track}

        # Evenly distribute frames
        indices = np.linspace(0, len(track) - 1, max_frames, dtype=int)
        return {track[i]["frame"] for i in indices}

    def _interpolate_depths(self, track: list, depths: dict) -> np.ndarray:
        """Interpolate depth values for all frames."""
        if not depths:
            # No depth data, use default
            return np.ones(len(track)) * 3.0  # 3 meters default

        frames = np.array([d["frame"] for d in track])
        depth_frames = sorted(depths.keys())
        depth_values = [depths[f] for f in depth_frames]

        # Interpolate
        interpolated = np.interp(frames, depth_frames, depth_values)

        return interpolated

    def _create_invalid_trajectory(
        self, frame_count: int, detected_count: int, reason: str
    ) -> dict:
        """Create an invalid trajectory result."""
        return {
            "positions": "[]",
            "frameCount": frame_count,
            "detectedFrameCount": detected_count,
            "averageConfidence": 0.0,
            "launchAngle": None,
            "launchSpeed": None,
            "maxHeight": None,
            "horizontalDistance": None,
            "flightTime": None,
            "isValid": False,
            "qualityScore": 0.0,
            "qualityNotes": reason,
        }
