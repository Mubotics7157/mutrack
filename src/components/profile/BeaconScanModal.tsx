import React from 'react';
import { Modal } from '../Modal';
import { toast } from 'sonner';

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
    <Modal isOpen={isOpen} onClose={handleClose} title="pair iBeacon" maxWidthClassName="max-w-2xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-text-muted text-sm">
            {isScanning ? 'scanning for beacons...' : scanError ? scanError : 'stopped'}
          </div>
          <div className="flex gap-2">
            <button
              className="btn-modern touch-feedback"
              onClick={() => (isScanning ? onStopScan() : onStartScan())}
            >
              {isScanning ? 'stop' : 'rescan'}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {foundBeacons.length === 0 && (
            <div className="text-sm text-text-muted">no beacons yet — keep the tag close or rescan</div>
          )}
          {foundBeacons.map((b) => (
            <div
              key={b.key}
              className="flex items-center justify-between p-3 bg-glass border border-border-glass rounded-lg"
            >
              <div>
                <div className="font-medium">{b.uuid}</div>
                <div className="text-xs text-text-dim">
                  major: {b.major} · minor: {b.minor}
                </div>
              </div>
              <button
                className="btn-modern btn-primary touch-feedback"
                onClick={() => onPairBeacon(b)}
              >
                pair
              </button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
