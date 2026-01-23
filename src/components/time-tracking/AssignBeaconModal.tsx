import React, { useRef, useState } from 'react';
import { Modal } from '../Modal';
import { MemberWithProfile } from '../../lib/members';
import { parseIbeaconFromAdvertisement, BeaconData } from './utils';

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
      setError('failed to start scan');
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

  return (
    <Modal isOpen={open} onClose={handleClose} title="assign beacon to member" maxWidthClassName="max-w-2xl">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block mb-2 text-sm text-text-muted">member</label>
            <select
              className="input-modern"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
            >
              <option value="">select member</option>
              {members.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button className="btn-modern touch-feedback" onClick={scanning ? stopScan : startScan}>
              {scanning ? 'stop' : 'rescan'}
            </button>
          </div>
          <div className="text-sm text-text-muted">
            {scanning ? 'scanning for beacons...' : error || 'stopped'}
          </div>
        </div>

        <div className="space-y-2">
          {beacons.length === 0 && (
            <div className="text-sm text-text-muted">no beacons yet — keep the tag close or rescan</div>
          )}
          {beacons.map((b) => (
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
                disabled={!memberId}
                onClick={() => handleAssign(b)}
              >
                assign
              </button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
