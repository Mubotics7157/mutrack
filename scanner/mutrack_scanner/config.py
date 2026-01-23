"""Configuration management for the scanner."""

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import yaml


@dataclass
class ScannerConfig:
    """Scanner configuration."""

    api_url: str
    api_key: str
    scan_interval: float = 1.0
    upload_interval: float = 10.0
    presence_ttl: float = 30.0
    retry_interval: float = 60.0
    log_level: str = "INFO"

    @classmethod
    def from_yaml(cls, path: Path) -> "ScannerConfig":
        """Load configuration from a YAML file."""
        with open(path) as f:
            data = yaml.safe_load(f)

        # Allow environment variable overrides
        api_url = os.environ.get("MUTRACK_API_URL", data.get("api_url", ""))
        api_key = os.environ.get("MUTRACK_API_KEY", data.get("api_key", ""))

        if not api_url:
            raise ValueError("api_url is required in config or MUTRACK_API_URL env var")
        if not api_key:
            raise ValueError("api_key is required in config or MUTRACK_API_KEY env var")

        return cls(
            api_url=api_url,
            api_key=api_key,
            scan_interval=float(data.get("scan_interval", 1.0)),
            upload_interval=float(data.get("upload_interval", 10.0)),
            presence_ttl=float(data.get("presence_ttl", 30.0)),
            retry_interval=float(data.get("retry_interval", 60.0)),
            log_level=data.get("log_level", "INFO").upper(),
        )

    def validate(self) -> None:
        """Validate configuration values."""
        if not self.api_url.startswith("http"):
            raise ValueError("api_url must be a valid HTTP(S) URL")
        if not self.api_key.startswith("msk_"):
            raise ValueError("api_key must start with 'msk_'")
        if self.scan_interval < 0.1:
            raise ValueError("scan_interval must be at least 0.1 seconds")
        if self.upload_interval < 1.0:
            raise ValueError("upload_interval must be at least 1.0 seconds")
