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
  return (
    <>
      <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted">
        <div>
          status:{' '}
          {isRunning ? (
            <span className="text-accent-green">running</span>
          ) : scanState === 'scanning' ? (
            <span className="text-yellow-400">cancelled</span>
          ) : scanState === 'error' ? (
            <span className="text-error-red">error</span>
          ) : (
            <span>stopped</span>
          )}
        </div>
        <div>
          last adv: {lastAdvRef ? `${Math.round((nowMs - lastAdvRef) / 1000)}s` : 'none yet'}
        </div>
        <div>active attendees: {activeCount}</div>
        <div>wake lock: {wakeLockActive ? 'on' : 'off'}</div>
        <div>writes: 1/min per beacon</div>
      </div>

      {scanState === 'error' && <div className="text-sm text-error-red">{errorText}</div>}
    </>
  );
}
