"""Ball detection using YOLOv8 with circle refinement."""

import logging
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# Lazy import to avoid loading torch at module import
_ultralytics = None


def _get_ultralytics():
    global _ultralytics
    if _ultralytics is None:
        from ultralytics import YOLO

        _ultralytics = YOLO
    return _ultralytics


def refine_circle(
    frame: np.ndarray,
    bbox: list[float],
    padding: float = 0.3,
) -> Optional[tuple[float, float, float]]:
    """
    Refine ball detection by finding the actual circle within the bbox.

    Args:
        frame: Full BGR image
        bbox: [x1, y1, x2, y2] bounding box from YOLO
        padding: Extra padding around bbox (as fraction of bbox size)

    Returns:
        (center_x, center_y, diameter) in full image coordinates, or None if no circle found
    """
    h, w = frame.shape[:2]
    x1, y1, x2, y2 = bbox
    box_w, box_h = x2 - x1, y2 - y1

    # Add padding
    pad_x = box_w * padding
    pad_y = box_h * padding
    x1_pad = max(0, int(x1 - pad_x))
    y1_pad = max(0, int(y1 - pad_y))
    x2_pad = min(w, int(x2 + pad_x))
    y2_pad = min(h, int(y2 + pad_y))

    # Crop region
    crop = frame[y1_pad:y2_pad, x1_pad:x2_pad]
    if crop.size == 0:
        return None

    # Convert to grayscale and blur
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (9, 9), 2)

    # Expected radius range based on bbox size
    expected_radius = (box_w + box_h) / 4
    min_radius = max(5, int(expected_radius * 0.5))
    max_radius = int(expected_radius * 1.5)

    # Hough Circle detection
    circles = cv2.HoughCircles(
        gray,
        cv2.HOUGH_GRADIENT,
        dp=1.2,
        minDist=min_radius * 2,
        param1=50,
        param2=30,
        minRadius=min_radius,
        maxRadius=max_radius,
    )

    if circles is not None and len(circles[0]) > 0:
        # Take the circle closest to the center of the crop
        crop_cx, crop_cy = (x2_pad - x1_pad) / 2, (y2_pad - y1_pad) / 2
        best_circle = None
        best_dist = float("inf")

        for circle in circles[0]:
            cx, cy, r = circle
            dist = np.sqrt((cx - crop_cx) ** 2 + (cy - crop_cy) ** 2)
            if dist < best_dist:
                best_dist = dist
                best_circle = circle

        if best_circle is not None:
            cx, cy, r = best_circle
            # Convert back to full image coordinates
            full_cx = x1_pad + cx
            full_cy = y1_pad + cy
            diameter = r * 2
            return (float(full_cx), float(full_cy), float(diameter))

    # Fallback: try contour-based detection
    # Use adaptive threshold to find bright/dark regions
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if contours:
        # Find the most circular contour
        best_contour = None
        best_circularity = 0

        for contour in contours:
            area = cv2.contourArea(contour)
            perimeter = cv2.arcLength(contour, True)
            if perimeter > 0 and area > 100:
                circularity = 4 * np.pi * area / (perimeter ** 2)
                if circularity > best_circularity and circularity > 0.5:
                    best_circularity = circularity
                    best_contour = contour

        if best_contour is not None:
            (cx, cy), radius = cv2.minEnclosingCircle(best_contour)
            if radius > 5:
                full_cx = x1_pad + cx
                full_cy = y1_pad + cy
                diameter = radius * 2
                return (float(full_cx), float(full_cy), float(diameter))

    return None


class BallDetector:
    """Detect balls in video frames using YOLOv8 with circle refinement."""

    def __init__(
        self,
        model_path: str = "yolov8n.pt",
        confidence_threshold: float = 0.5,
        target_class: int | None = None,  # None = accept any class (for custom models)
        refine_circles: bool = True,  # Whether to refine bbox to actual circle
    ):
        """
        Initialize ball detector.

        Args:
            model_path: Path to YOLO model or model name to download
            confidence_threshold: Minimum confidence for detection
            target_class: Class ID to detect (None = any class, 32 = COCO sports ball)
            refine_circles: Whether to refine bounding boxes to circles
        """
        self.confidence_threshold = confidence_threshold
        self.target_class = target_class
        self.refine_circles = refine_circles
        self._model = None
        self._model_path = model_path

    @property
    def model(self):
        """Lazy load YOLO model."""
        if self._model is None:
            YOLO = _get_ultralytics()
            logger.info(f"Loading YOLO model: {self._model_path}")
            self._model = YOLO(self._model_path)
            logger.info("YOLO model loaded")
        return self._model

    def detect(self, frame: np.ndarray) -> Optional[dict]:
        """
        Detect a ball in a single frame.

        Args:
            frame: BGR image from OpenCV

        Returns:
            Detection dict with center_x, center_y, bbox, confidence
            or None if no ball detected
        """
        # Run inference
        results = self.model(frame, verbose=False)[0]

        # Filter by class (if specified) and confidence threshold
        best_detection = None
        best_confidence = 0

        for box in results.boxes:
            cls = int(box.cls[0])
            conf = float(box.conf[0])

            # Check class filter (None = accept any class)
            class_match = self.target_class is None or cls == self.target_class

            if class_match and conf > self.confidence_threshold:
                if conf > best_confidence:
                    best_confidence = conf
                    xyxy = box.xyxy[0].cpu().numpy()
                    x1, y1, x2, y2 = xyxy

                    best_detection = {
                        "center_x": (x1 + x2) / 2,
                        "center_y": (y1 + y2) / 2,
                        "bbox": [float(x1), float(y1), float(x2), float(y2)],
                        "confidence": conf,
                        "width": float(x2 - x1),
                        "height": float(y2 - y1),
                    }

        # Refine detection with circle fitting
        if best_detection is not None and self.refine_circles:
            refined = refine_circle(frame, best_detection["bbox"])
            if refined is not None:
                cx, cy, diameter = refined
                best_detection["center_x"] = cx
                best_detection["center_y"] = cy
                best_detection["width"] = diameter
                best_detection["height"] = diameter
                best_detection["refined"] = True
            else:
                best_detection["refined"] = False

        return best_detection

    def detect_batch(self, frames: list[np.ndarray]) -> list[Optional[dict]]:
        """
        Detect balls in multiple frames (batched for efficiency).

        Args:
            frames: List of BGR images

        Returns:
            List of detection dicts (or None for frames with no detection)
        """
        if not frames:
            return []

        # Run batched inference
        results = self.model(frames, verbose=False)

        detections = []
        for result in results:
            best_detection = None
            best_confidence = 0

            for box in result.boxes:
                cls = int(box.cls[0])
                conf = float(box.conf[0])

                class_match = self.target_class is None or cls == self.target_class

                if class_match and conf > self.confidence_threshold:
                    if conf > best_confidence:
                        best_confidence = conf
                        xyxy = box.xyxy[0].cpu().numpy()
                        x1, y1, x2, y2 = xyxy

                        best_detection = {
                            "center_x": (x1 + x2) / 2,
                            "center_y": (y1 + y2) / 2,
                            "bbox": [float(x1), float(y1), float(x2), float(y2)],
                            "confidence": conf,
                            "width": float(x2 - x1),
                            "height": float(y2 - y1),
                        }

            detections.append(best_detection)

        return detections
