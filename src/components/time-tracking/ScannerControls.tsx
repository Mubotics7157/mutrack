import { Play, Square, AlertCircle } from 'lucide-react';
import { Id } from '../../../convex/_generated/dataModel';
import { Select, Button } from '../ui';
import type { ScanState } from './utils';
import { canScan } from './utils';

interface Meeting {
  _id: Id<'meetings'>;
  title: string;
  date: number;
}

interface ScannerControlsProps {
  selectedMeetingId: Id<'meetings'> | '';
  onMeetingChange: (id: Id<'meetings'> | '') => void;
  meetings: Meeting[];
  scanState: ScanState;
  canOperate: boolean;
  onStartScan: () => void;
  onStopScan: () => void;
}

export function ScannerControls({
  selectedMeetingId,
  onMeetingChange,
  meetings,
  scanState,
  canOperate,
  onStartScan,
  onStopScan,
}: ScannerControlsProps) {
  const meetingOptions = [
    { value: '', label: 'Select meeting' },
    ...meetings.map((m) => ({
      value: m._id,
      label: `${new Date(m.date).toLocaleDateString()} - ${m.title}`,
    })),
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block mb-2 text-sm font-medium text-text-primary">Meeting</label>
          <Select
            value={selectedMeetingId || ''}
            onChange={(e) => onMeetingChange((e.target.value || '') as any)}
            options={meetingOptions}
          />
        </div>

        <div className="flex items-end gap-2">
          <Button
            variant="primary"
            disabled={!canOperate || scanState === 'scanning'}
            onClick={onStartScan}
            icon={<Play size={16} />}
            className="flex-1"
          >
            Start Scanning
          </Button>
          <Button
            variant="secondary"
            disabled={scanState !== 'scanning'}
            onClick={onStopScan}
            icon={<Square size={16} />}
            className="flex-1"
          >
            Stop
          </Button>
        </div>
      </div>

      {!canScan && (
        <div className="flex items-center gap-2 text-sm text-accent-error">
          <AlertCircle size={16} />
          <span>Web Bluetooth scanning not supported in this browser</span>
        </div>
      )}
    </div>
  );
}
