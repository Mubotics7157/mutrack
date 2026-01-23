"""HTTP client for communicating with the MuTrack Convex backend."""

import logging
import platform
import socket
from typing import Dict, List, Optional

import aiohttp

from .config import ScannerConfig
from .ibeacon import IBeacon

logger = logging.getLogger(__name__)


class ConvexApiClient:
    """Async HTTP client for the MuTrack scanner API."""

    def __init__(self, config: ScannerConfig):
        """
        Initialize the API client.

        Args:
            config: Scanner configuration containing API URL and key.
        """
        self.config = config
        self._session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self) -> "ConvexApiClient":
        """Create the HTTP session when entering context."""
        self._session = aiohttp.ClientSession(
            headers={
                "Authorization": f"Bearer {self.config.api_key}",
                "Content-Type": "application/json",
            },
            timeout=aiohttp.ClientTimeout(total=30),
        )
        return self

    async def __aexit__(self, *args) -> None:
        """Close the HTTP session when exiting context."""
        if self._session:
            await self._session.close()
            self._session = None

    async def send_sightings(self, beacons: List[IBeacon]) -> bool:
        """
        Send beacon sightings to the server.

        Args:
            beacons: List of iBeacons that are currently present.

        Returns:
            True if the request succeeded, False otherwise.
        """
        if not beacons:
            return True

        if not self._session:
            logger.error("API client not initialized (use async context manager)")
            return False

        payload = {
            "sightings": [
                {
                    "uuid": b.uuid,
                    "major": b.major,
                    "minor": b.minor,
                    "rssi": b.rssi,
                }
                for b in beacons
            ]
        }

        try:
            url = f"{self.config.api_url}/beacon-sightings"
            async with self._session.post(url, json=payload) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    logger.debug(
                        f"Sent {len(beacons)} sightings, "
                        f"processed: {data.get('processed', '?')}, "
                        f"active meetings: {data.get('activeMeetings', '?')}"
                    )
                    return True
                else:
                    text = await resp.text()
                    logger.warning(f"API error {resp.status}: {text}")
                    return False
        except aiohttp.ClientError as e:
            logger.error(f"Connection error: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending sightings: {e}")
            return False

    async def send_heartbeat(self, metadata: Optional[Dict] = None) -> bool:
        """
        Send a heartbeat to the server.

        Args:
            metadata: Optional metadata about the scanner device.

        Returns:
            True if the request succeeded, False otherwise.
        """
        if not self._session:
            logger.error("API client not initialized (use async context manager)")
            return False

        # Build metadata if not provided
        if metadata is None:
            metadata = self._get_device_metadata()

        payload = {"metadata": metadata}

        try:
            url = f"{self.config.api_url}/heartbeat"
            async with self._session.post(url, json=payload) as resp:
                if resp.status == 200:
                    logger.debug("Heartbeat sent successfully")
                    return True
                else:
                    text = await resp.text()
                    logger.warning(f"Heartbeat error {resp.status}: {text}")
                    return False
        except aiohttp.ClientError as e:
            logger.error(f"Connection error during heartbeat: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending heartbeat: {e}")
            return False

    def _get_device_metadata(self) -> Dict:
        """Get metadata about the current device."""
        try:
            hostname = socket.gethostname()
        except Exception:
            hostname = "unknown"

        # Determine platform
        system = platform.system().lower()
        if system == "darwin":
            plat = "macos"
        elif system == "linux":
            # Check if Raspberry Pi
            try:
                with open("/proc/cpuinfo") as f:
                    if "raspberry" in f.read().lower():
                        plat = "raspberrypi"
                    else:
                        plat = "linux"
            except Exception:
                plat = "linux"
        else:
            plat = system

        from . import __version__

        return {
            "platform": plat,
            "version": __version__,
            "hostname": hostname,
        }
