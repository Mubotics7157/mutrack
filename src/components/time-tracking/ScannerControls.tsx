import { Id } from '../../../convex/_generated/dataModel';
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
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
      <div>
        <label className="block mb-2 text-sm text-text-muted">meeting</label>
        <select
          className="input-modern"
          value={selectedMeetingId || ''}
          onChange={(e) => onMeetingChange((e.target.value || '') as any)}
        >
          <option value="">select meeting</option>
          {meetings.map((m) => (
            <option key={m._id} value={m._id}>
              {new Date(m.date).toLocaleDateString()} {m.title}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <button
          disabled={!canOperate || scanState === 'scanning'}
          onClick={onStartScan}
          className="btn-modern btn-primary flex-1 touch-feedback"
        >
          start scanning
        </button>
        <button
          disabled={scanState !== 'scanning'}
          onClick={onStopScan}
          className="btn-modern flex-1 touch-feedback"
        >
          stop
        </button>
      </div>

      {!canScan && (
        <div className="text-sm text-error-red">
          web bluetooth scanning not supported in this browser
        </div>
      )}
    </div>
  );
}
