"""Depth estimation using Depth Anything V2."""

import logging
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

# Lazy imports
_torch = None
_pipeline = None


def _get_torch():
    global _torch
    if _torch is None:
        import torch

        _torch = torch
    return _torch


def _get_pipeline():
    global _pipeline
    if _pipeline is None:
        from transformers import pipeline

        _pipeline = pipeline
    return _pipeline


class DepthEstimator:
    """Estimate depth maps using Depth Anything V2."""

    def __init__(
        self,
        model_name: str = "depth-anything/Depth-Anything-V2-Small-hf",
        device: Optional[str] = None,
    ):
        """
        Initialize depth estimator.

        Args:
            model_name: HuggingFace model name
            device: Device to use (auto-detected if None)
        """
        self.model_name = model_name
        self._pipe = None
        self._device = device

    @property
    def device(self) -> str:
        """Get device to use."""
        if self._device is None:
            torch = _get_torch()
            if torch.cuda.is_available():
                self._device = "cuda"
            elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                self._device = "mps"
            else:
                self._device = "cpu"
        return self._device

    @property
    def pipe(self):
        """Lazy load depth estimation pipeline."""
        if self._pipe is None:
            pipeline = _get_pipeline()
            torch = _get_torch()

            logger.info(f"Loading depth model: {self.model_name} on {self.device}")

            # Use float16 on GPU for efficiency
            dtype = torch.float16 if self.device == "cuda" else torch.float32

            self._pipe = pipeline(
                "depth-estimation",
                model=self.model_name,
                device=self.device,
                torch_dtype=dtype,
            )
            logger.info("Depth model loaded")

        return self._pipe

    def estimate(self, frame: np.ndarray) -> np.ndarray:
        """
        Estimate depth for a single frame.

        Args:
            frame: BGR image from OpenCV (H x W x 3)

        Returns:
            Depth map (H x W) with relative depth values
        """
        import cv2
        from PIL import Image

        # Convert BGR to RGB
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Convert to PIL Image
        pil_image = Image.fromarray(rgb)

        # Run inference
        result = self.pipe(pil_image)

        # Get depth map
        depth = np.array(result["depth"])

        # Resize to match input if needed
        if depth.shape[:2] != frame.shape[:2]:
            depth = cv2.resize(
                depth, (frame.shape[1], frame.shape[0]), interpolation=cv2.INTER_LINEAR
            )

        return depth

    def estimate_batch(self, frames: list[np.ndarray]) -> list[np.ndarray]:
        """
        Estimate depth for multiple frames.

        Args:
            frames: List of BGR images

        Returns:
            List of depth maps
        """
        # For now, process sequentially
        # Could be optimized with batching if needed
        return [self.estimate(frame) for frame in frames]
