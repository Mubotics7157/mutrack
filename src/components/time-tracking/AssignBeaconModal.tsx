import { useRef, useState } from 'react';
import { Bluetooth, RefreshCw, Square } from 'lucide-react';
import { Modal } from '../Modal';
import { MemberWithProfile } from '../../lib/members';
import { parseIbeaconFromAdvertisement, BeaconData } from './utils';
import { Select, Button } from '../ui';

interface AssignBeaconModalProps {
  open: boolean;
  onClose: () => void;
  members: MemberWithProfile[];
  onAssign: (beacon: { uuid: string; major: number; minor: number }, memberId: string) => void;
}

export function AssignBeaconModal({ open, onClose, members, onAssign }: AssignBeaconModalProps) {
  const [memberId, setMemberId] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [beacons, setBeacons] = useState<BeaconData[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const stopRef = useRef<(() => void) | undefined>(undefined);

  const startScan = async () => {
    const bluetooth: any = (navigator as any).bluetooth;
    setScanning(true);
    setError(null);
    setBeacons([]);
    seenRef.current.clear();

    try {
      try {
        await (navigator as any).permissions?.query?.({ name: 'bluetooth-le' as any });
      } catch {}
      try {
        await bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: [] });
      } catch {}

      const scan = await bluetooth.requestLEScan({
        acceptAllAdvertisements: true,
        keepRepeatedDevices: true,
      });

      const onAdv = (event: any) => {
        const ib = parseIbeaconFromAdvertisement(event);
        if (!ib) return;
        const key = `${ib.uuid}:${ib.major}:${ib.minor}`;
        if (seenRef.current.has(key)) return;
        seenRef.current.add(key);
        setBeacons((prev) => [...prev, { ...ib, key }]);
      };

      bluetooth.addEventListener('advertisementreceived', onAdv);
      stopRef.current = () => {
        try {
          bluetooth.removeEventListener('advertisementreceived', onAdv);
          scan.stop?.();
        } catch {}
      };
    } catch {
      setError('Failed to start scan');
      setScanning(false);
    }
  };

  const stopScan = () => {
    stopRef.current?.();
    setScanning(false);
  };

  const handleClose = () => {
    stopScan();
    setMemberId('');
    setBeacons([]);
    setError(null);
    onClose();
  };

  const handleAssign = (beacon: BeaconData) => {
    onAssign(beacon, memberId);
    handleClose();
  };

  const memberOptions = [
    { value: '', label: 'Select member' },
    ...members.map((m) => ({ value: m._id, label: m.name })),
  ];

  return (
    <Modal isOpen={open} onClose={handleClose} title="Assign Beacon to Member" maxWidthClassName="max-w-2xl">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-text-primary">Member</label>
            <Select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              options={memberOptions}
            />
          </div>
          <div className="flex flex-col justify-end gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={scanning ? <Square size={14} /> : <RefreshCw size={14} />}
                onClick={scanning ? stopScan : startScan}
              >
                {scanning ? 'Stop' : 'Scan'}
              </Button>
              <div className="flex items-center gap-2 text-sm text-text-muted">
                {scanning && <div className="w-2 h-2 rounded-full bg-accent-success animate-pulse" />}
                <span>{scanning ? 'Scanning...' : error || 'Ready'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {beacons.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center mb-3">
                <Bluetooth size={24} className="text-text-muted" />
              </div>
              <p className="text-sm text-text-muted">No beacons found yet</p>
              <p className="text-xs text-text-dim mt-1">Keep your beacon tag close and scan</p>
            </div>
          )}
          {beacons.map((b) => (
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
                disabled={!memberId}
                onClick={() => handleAssign(b)}
              >
                Assign
              </Button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
