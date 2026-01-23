import { Bluetooth, RefreshCw, Square } from 'lucide-react';
import { Modal } from '../Modal';
import { Button } from '../ui';

interface BeaconData {
  uuid: string;
  major: number;
  minor: number;
  key: string;
  lastSeen: number;
}

interface BeaconScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  isScanning: boolean;
  scanError: string | null;
  foundBeacons: BeaconData[];
  onStartScan: () => void;
  onStopScan: () => void;
  onPairBeacon: (beacon: BeaconData) => Promise<void>;
}

export function BeaconScanModal({
  isOpen,
  onClose,
  isScanning,
  scanError,
  foundBeacons,
  onStartScan,
  onStopScan,
  onPairBeacon,
}: BeaconScanModalProps) {
  const handleClose = () => {
    onStopScan();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Pair iBeacon" maxWidthClassName="max-w-2xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isScanning && (
              <div className="w-2 h-2 rounded-full bg-accent-success animate-pulse" />
            )}
            <span className="text-sm text-text-muted">
              {isScanning ? 'Scanning for beacons...' : scanError ? scanError : 'Scan stopped'}
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={isScanning ? <Square size={14} /> : <RefreshCw size={14} />}
            onClick={() => (isScanning ? onStopScan() : onStartScan())}
          >
            {isScanning ? 'Stop' : 'Rescan'}
          </Button>
        </div>

        <div className="space-y-2">
          {foundBeacons.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center mb-3">
                <Bluetooth size={24} className="text-text-muted" />
              </div>
              <p className="text-sm text-text-muted">No beacons found yet</p>
              <p className="text-xs text-text-dim mt-1">Keep your beacon tag close and rescan</p>
            </div>
          )}
          {foundBeacons.map((b) => (
            <div
              key={b.key}
              className="flex items-center justify-between p-4 bg-bg-tertiary border border-border rounded-lg"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-text-primary font-mono truncate">{b.uuid}</div>
                <div className="text-xs text-text-muted mt-0.5">
                  Major: {b.major} · Minor: {b.minor}
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onPairBeacon(b)}
              >
                Pair
              </Button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
