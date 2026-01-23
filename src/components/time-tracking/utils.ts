// Parse iBeacon from Web Bluetooth advertisement event (Chrome experimental)
export function parseIbeaconFromAdvertisement(
  event: any
): { uuid: string; major: number; minor: number } | null {
  try {
    // event.manufacturerData is a Map<number, DataView> where Apple company ID is 0x004C
    const md: Map<number, DataView> | undefined = event.manufacturerData;
    if (!md || typeof md.get !== 'function') return null;
    const apple = (md as any).get(0x004c) as DataView | undefined;
    if (!apple) return null;
    // iBeacon layout after 0x004C company ID:
    // Byte 0-1: Beacon Type 0x02 0x15, next 16 UUID, next 2 Major, next 2 Minor, next 1 TxPower
    const bytes = new Uint8Array(apple.buffer, apple.byteOffset, apple.byteLength);
    if (bytes.length < 23) return null;
    if (!(bytes[0] === 0x02 && bytes[1] === 0x15)) return null;
    const uuidBytes = bytes.slice(2, 18);
    const major = (bytes[18] << 8) + bytes[19];
    const minor = (bytes[20] << 8) + bytes[21];
    const uuid = bytesToUuid(uuidBytes);
    return { uuid, major, minor };
  } catch {
    return null;
  }
}

function bytesToUuid(b: Uint8Array): string {
  const hex = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return (
    hex.substring(0, 8) +
    '-' +
    hex.substring(8, 12) +
    '-' +
    hex.substring(12, 16) +
    '-' +
    hex.substring(16, 20) +
    '-' +
    hex.substring(20)
  );
}

export type ScanState = 'idle' | 'scanning' | 'error';

export interface BeaconData {
  uuid: string;
  major: number;
  minor: number;
  key: string;
}

export const canScan =
  typeof navigator !== 'undefined' &&
  (navigator as any).bluetooth &&
  (navigator as any).bluetooth?.requestLEScan;
