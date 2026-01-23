import { Activity, Clock, Users, Lock, Radio, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ScanState } from './utils';

interface ScannerStatusProps {
  scanState: ScanState;
  isRunning: boolean;
  lastAdvRef: number;
  nowMs: number;
  activeCount: number;
  wakeLockActive: boolean;
  errorText: string | null;
}

export function ScannerStatus({
  scanState,
  isRunning,
  lastAdvRef,
  nowMs,
  activeCount,
  wakeLockActive,
  errorText,
}: ScannerStatusProps) {
  const getStatusInfo = () => {
    if (isRunning) return { text: 'Running', color: 'text-accent-success', dot: 'bg-accent-success' };
    if (scanState === 'scanning') return { text: 'Interrupted', color: 'text-accent-warning', dot: 'bg-accent-warning' };
    if (scanState === 'error') return { text: 'Error', color: 'text-accent-error', dot: 'bg-accent-error' };
    return { text: 'Stopped', color: 'text-text-muted', dot: 'bg-text-muted' };
  };

  const status = getStatusInfo();

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Status */}
        <div className="bg-bg-tertiary rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
            <Activity size={12} />
            <span>Status</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn('w-2 h-2 rounded-full', status.dot, isRunning && 'animate-pulse')} />
            <span className={cn('text-sm font-medium', status.color)}>{status.text}</span>
          </div>
        </div>

        {/* Last Advertisement */}
        <div className="bg-bg-tertiary rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
            <Clock size={12} />
            <span>Last Signal</span>
          </div>
          <span className="text-sm font-medium text-text-primary">
            {lastAdvRef ? `${Math.round((nowMs - lastAdvRef) / 1000)}s ago` : 'None'}
          </span>
        </div>

        {/* Active Attendees */}
        <div className="bg-bg-tertiary rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
            <Users size={12} />
            <span>Active</span>
          </div>
          <span className="text-sm font-medium text-text-primary">{activeCount}</span>
        </div>

        {/* Wake Lock */}
        <div className="bg-bg-tertiary rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
            <Lock size={12} />
            <span>Wake Lock</span>
          </div>
          <span className={cn('text-sm font-medium', wakeLockActive ? 'text-accent-success' : 'text-text-muted')}>
            {wakeLockActive ? 'Active' : 'Off'}
          </span>
        </div>

        {/* Write Rate */}
        <div className="bg-bg-tertiary rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
            <Radio size={12} />
            <span>Rate</span>
          </div>
          <span className="text-sm font-medium text-text-primary">1/min</span>
        </div>
      </div>

      {scanState === 'error' && errorText && (
        <div className="flex items-start gap-2 text-sm text-accent-error bg-accent-error/10 border border-accent-error/30 rounded-lg p-3">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{errorText}</span>
        </div>
      )}
    </div>
  );
}
