"""Configuration settings for the ballistics backend."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Convex API
    convex_url: str = ""
    ml_worker_api_key: str = ""

    # Worker settings
    worker_name: str = "local-worker"
    poll_interval_seconds: float = 5.0
    max_retries: int = 3

    # Model paths (can be overridden for local dev)
    yolo_model: str = "yolov8n.pt"  # Will download if not present
    depth_model: str = "depth-anything/Depth-Anything-V2-Small-hf"

    # Processing settings
    detection_confidence: float = 0.5
    tracking_confidence: float = 0.3
    max_frames: int = 1000  # Max frames to process per video

    # Physics defaults (can be overridden per-model)
    ball_diameter: float = 0.15  # meters (5.91 inches)
    ball_mass: float = 0.27  # kg
    air_density: float = 1.225  # kg/m³
    gravity: float = 9.81  # m/s²

    class Config:
        env_file = ".env"
        env_prefix = "BALLISTICS_"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
