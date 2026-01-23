"""Presence tracking for beacons with TTL-based expiration."""

import logging
import time
from dataclasses import dataclass, field
from typing import Dict, List

from .ibeacon import IBeacon

logger = logging.getLogger(__name__)


@dataclass
class BeaconPresence:
    """Tracks a beacon's presence state."""

    beacon: IBeacon
    first_seen: float
    last_seen: float
    reported: bool = False


class PresenceTracker:
    """
    Tracks which beacons are currently present.

    Beacons are considered "present" if they've been seen within the TTL window.
    When a beacon hasn't been seen for longer than TTL, it's removed.
    """

    def __init__(self, ttl: float = 30.0):
        """
        Initialize the presence tracker.

        Args:
            ttl: Time-to-live in seconds. Beacons not seen for this long are expired.
        """
        self.ttl = ttl
        self._beacons: Dict[str, BeaconPresence] = {}

    def update(self, beacon: IBeacon) -> None:
        """
        Update presence for a beacon sighting.

        Args:
            beacon: The iBeacon that was detected.
        """
        key = beacon.key
        now = time.time()

        if key in self._beacons:
            # Update existing presence
            self._beacons[key].last_seen = now
            self._beacons[key].beacon = beacon  # Update RSSI etc.
        else:
            # New beacon arrival
            logger.info(f"Beacon arrived: {key} (RSSI: {beacon.rssi})")
            self._beacons[key] = BeaconPresence(
                beacon=beacon,
                first_seen=now,
                last_seen=now,
            )

    def get_present_beacons(self) -> List[IBeacon]:
        """
        Get all currently present beacons.

        This also cleans up expired beacons.

        Returns:
            List of beacons that are currently present.
        """
        now = time.time()
        present = []
        expired_keys = []

        for key, presence in self._beacons.items():
            if now - presence.last_seen > self.ttl:
                expired_keys.append(key)
                logger.info(f"Beacon departed: {key}")
            else:
                present.append(presence.beacon)

        # Clean up expired beacons
        for key in expired_keys:
            del self._beacons[key]

        return present

    def get_all_for_upload(self) -> List[IBeacon]:
        """
        Get all present beacons for uploading to the server.

        This returns the same list as get_present_beacons but is
        semantically clearer for the upload use case.
        """
        return self.get_present_beacons()

    @property
    def count(self) -> int:
        """Number of currently tracked beacons (before expiration check)."""
        return len(self._beacons)
