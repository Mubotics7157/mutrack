"""Ball tracking using ByteTrack-style algorithm."""

import logging
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)


class BallTracker:
    """
    Track ball across frames using simple nearest-neighbor matching.

    For a single-ball scenario, this is simpler than full ByteTrack
    but uses similar principles.
    """

    def __init__(
        self,
        track_threshold: float = 0.3,
        max_gap: int = 10,
        max_distance: float = 100.0,
    ):
        """
        Initialize tracker.

        Args:
            track_threshold: Minimum confidence to start/continue track
            max_gap: Maximum frames to interpolate over
            max_distance: Maximum pixel distance for matching
        """
        self.track_threshold = track_threshold
        self.max_gap = max_gap
        self.max_distance = max_distance

    def track(self, detections: list[dict]) -> list[list[dict]]:
        """
        Track detections across frames.

        Args:
            detections: List of detection dicts with frame, center_x, center_y

        Returns:
            List of tracks, where each track is a list of detections
        """
        if not detections:
            return []

        # Sort by frame
        sorted_dets = sorted(detections, key=lambda d: d["frame"])

        # Build tracks using simple greedy matching
        tracks = []
        current_track = []
        last_det = None

        for det in sorted_dets:
            if det["confidence"] < self.track_threshold:
                continue

            if last_det is None:
                # Start new track
                current_track = [det]
                last_det = det
                continue

            # Check frame gap
            frame_gap = det["frame"] - last_det["frame"]

            if frame_gap > self.max_gap:
                # Gap too large, save current track and start new one
                if len(current_track) >= 3:
                    tracks.append(current_track)
                current_track = [det]
                last_det = det
                continue

            # Check distance
            distance = np.sqrt(
                (det["center_x"] - last_det["center_x"]) ** 2
                + (det["center_y"] - last_det["center_y"]) ** 2
            )

            # Adjust max distance based on frame gap (allow more movement over time)
            adjusted_max_distance = self.max_distance * (1 + frame_gap * 0.5)

            if distance > adjusted_max_distance:
                # Too far, might be a different object
                if len(current_track) >= 3:
                    tracks.append(current_track)
                current_track = [det]
                last_det = det
                continue

            # Add to current track
            current_track.append(det)
            last_det = det

        # Save final track
        if len(current_track) >= 3:
            tracks.append(current_track)

        # Interpolate gaps in tracks
        interpolated_tracks = []
        for track in tracks:
            interpolated = self._interpolate_track(track)
            interpolated_tracks.append(interpolated)

        return interpolated_tracks

    def _interpolate_track(self, track: list[dict]) -> list[dict]:
        """Interpolate missing frames in a track."""
        if len(track) < 2:
            return track

        # Sort by frame
        track = sorted(track, key=lambda d: d["frame"])

        interpolated = []
        for i in range(len(track) - 1):
            current = track[i]
            next_det = track[i + 1]

            interpolated.append(current)

            # Check for gap
            frame_gap = next_det["frame"] - current["frame"]
            if frame_gap > 1:
                # Interpolate intermediate frames
                for j in range(1, frame_gap):
                    t = j / frame_gap
                    interpolated_det = {
                        "frame": current["frame"] + j,
                        "time": current["time"] + (next_det["time"] - current["time"]) * t,
                        "center_x": current["center_x"]
                        + (next_det["center_x"] - current["center_x"]) * t,
                        "center_y": current["center_y"]
                        + (next_det["center_y"] - current["center_y"]) * t,
                        "confidence": (current["confidence"] + next_det["confidence"])
                        / 2
                        * 0.8,  # Lower confidence for interpolated
                        "interpolated": True,
                    }
                    # Interpolate bbox size if available
                    if "width" in current and "width" in next_det:
                        interpolated_det["width"] = current["width"] + (next_det["width"] - current["width"]) * t
                        interpolated_det["height"] = current["height"] + (next_det["height"] - current["height"]) * t
                    interpolated.append(interpolated_det)

        # Add last detection
        interpolated.append(track[-1])

        return interpolated
