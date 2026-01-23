"""BLE beacon scanner using bleak."""

import asyncio
import logging
from typing import Callable, Optional

from bleak import BleakScanner
from bleak.backends.device import BLEDevice
from bleak.backends.scanner import AdvertisementData

from .config import ScannerConfig
from .ibeacon import IBeacon, parse_ibeacon
from .presence import PresenceTracker

logger = logging.getLogger(__name__)


class BeaconScanner:
    """
    Continuous BLE scanner for iBeacon detection.

    Uses bleak for cross-platform BLE scanning. Detected iBeacons are
    passed to a PresenceTracker for state management.
    """

    def __init__(
        self,
        config: ScannerConfig,
        presence_tracker: PresenceTracker,
        on_beacon: Optional[Callable[[IBeacon], None]] = None,
    ):
        """
        Initialize the beacon scanner.

        Args:
            config: Scanner configuration.
            presence_tracker: Tracker for beacon presence state.
            on_beacon: Optional callback for each beacon detection.
        """
        self.config = config
        self.presence = presence_tracker
        self.on_beacon = on_beacon
        self._running = False
        self._scanner: Optional[BleakScanner] = None
        self._detection_count = 0

    def _detection_callback(
        self, device: BLEDevice, advertisement_data: AdvertisementData
    ) -> None:
        """Handle a BLE advertisement detection."""
        ibeacon = parse_ibeacon(device, advertisement_data)
        if ibeacon:
            self._detection_count += 1
            self.presence.update(ibeacon)
            if self.on_beacon:
                self.on_beacon(ibeacon)

    async def start(self) -> None:
        """
        Start scanning for BLE beacons.

        This runs until stop() is called. It continuously scans and
        updates the presence tracker with detected iBeacons.
        """
        self._running = True
        self._detection_count = 0

        logger.info("Starting BLE scanner...")

        try:
            self._scanner = BleakScanner(
                detection_callback=self._detection_callback,
                # Scan for all devices, we filter for iBeacons ourselves
            )

            await self._scanner.start()
            logger.info("BLE scanner started successfully")

            # Keep running until stopped
            while self._running:
                await asyncio.sleep(self.config.scan_interval)

        except Exception as e:
            logger.error(f"Scanner error: {e}")
            raise
        finally:
            if self._scanner:
                try:
                    await self._scanner.stop()
                except Exception as e:
                    logger.warning(f"Error stopping scanner: {e}")
            logger.info(
                f"BLE scanner stopped. Total detections: {self._detection_count}"
            )

    def stop(self) -> None:
        """Signal the scanner to stop."""
        logger.info("Stopping BLE scanner...")
        self._running = False

    @property
    def is_running(self) -> bool:
        """Check if the scanner is running."""
        return self._running

    @property
    def detection_count(self) -> int:
        """Total number of iBeacon detections since start."""
        return self._detection_count
