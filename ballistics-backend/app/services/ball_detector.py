"""Ball detection using YOLOv8."""

import logging
from typing import Optional

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


class BallDetector:
    """Detect balls in video frames using YOLOv8."""

    def __init__(
        self,
        model_path: str = "yolov8n.pt",
        confidence_threshold: float = 0.5,
        target_class: int | None = None,  # None = accept any class (for custom models)
    ):
        """
        Initialize ball detector.

        Args:
            model_path: Path to YOLO model or model name to download
            confidence_threshold: Minimum confidence for detection
            target_class: Class ID to detect (None = any class, 32 = COCO sports ball)
        """
        self.confidence_threshold = confidence_threshold
        self.target_class = target_class
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
