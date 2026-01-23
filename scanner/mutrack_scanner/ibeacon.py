"""iBeacon advertisement parsing."""

from dataclasses import dataclass
from typing import Optional

from bleak.backends.device import BLEDevice
from bleak.backends.scanner import AdvertisementData


@dataclass
class IBeacon:
    """Parsed iBeacon data."""

    uuid: str
    major: int
    minor: int
    rssi: Optional[int] = None
    tx_power: Optional[int] = None

    @property
    def key(self) -> str:
        """Canonical beacon key for deduplication."""
        return f"{self.uuid}:{self.major}:{self.minor}"


# Apple company identifier
APPLE_COMPANY_ID = 0x004C

# iBeacon type and length
IBEACON_TYPE = 0x02
IBEACON_LENGTH = 0x15


def parse_ibeacon(
    device: BLEDevice, advertisement_data: AdvertisementData
) -> Optional[IBeacon]:
    """
    Parse iBeacon from BLE advertisement data.

    iBeacon format (Apple manufacturer data, company ID 0x004C):
    - Byte 0: Type (0x02 for iBeacon)
    - Byte 1: Length (0x15 = 21 bytes)
    - Bytes 2-17: UUID (16 bytes)
    - Bytes 18-19: Major (big-endian)
    - Bytes 20-21: Minor (big-endian)
    - Byte 22: TX Power (signed int8)

    Returns None if the advertisement is not an iBeacon.
    """
    mfr_data = advertisement_data.manufacturer_data
    if not mfr_data:
        return None

    # Look for Apple manufacturer data
    apple_data = mfr_data.get(APPLE_COMPANY_ID)
    if not apple_data or len(apple_data) < 23:
        return None

    # Verify iBeacon type and length
    if apple_data[0] != IBEACON_TYPE or apple_data[1] != IBEACON_LENGTH:
        return None

    # Extract UUID (bytes 2-17)
    uuid_bytes = apple_data[2:18]
    uuid = "-".join(
        [
            uuid_bytes[0:4].hex(),
            uuid_bytes[4:6].hex(),
            uuid_bytes[6:8].hex(),
            uuid_bytes[8:10].hex(),
            uuid_bytes[10:16].hex(),
        ]
    )

    # Extract major and minor (big-endian)
    major = (apple_data[18] << 8) | apple_data[19]
    minor = (apple_data[20] << 8) | apple_data[21]

    # Extract TX power (signed int8)
    tx_power = apple_data[22]
    if tx_power > 127:
        tx_power = tx_power - 256

    return IBeacon(
        uuid=uuid,
        major=major,
        minor=minor,
        rssi=advertisement_data.rssi,
        tx_power=tx_power,
    )
