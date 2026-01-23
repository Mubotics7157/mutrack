import React from 'react';
import { Toggle } from '../ui';

interface PreferencesSectionProps {
  onEnableNotifications: () => void;
  onScanAndPair: () => void;
  myBeacons: any[] | undefined;
  onRenameBeacon: (beacon: any) => void;
  onUnpairBeacon: (beacon: any) => void;
}

export function PreferencesSection({
  onEnableNotifications,
  onScanAndPair,
  myBeacons,
  onRenameBeacon,
  onUnpairBeacon,
}: PreferencesSectionProps) {
  return (
    <div className="glass-panel p-8">
      <h2 className="text-xl font-light mb-6">preferences</h2>

      <div className="space-y-4">
        <div className="flex justify-between items-center p-4 bg-glass border border-border-glass rounded-xl">
          <div>
            <h3 className="text-sm font-medium text-text-primary">meeting reminders</h3>
            <p className="text-xs text-text-muted mt-1">enable web push on this device</p>
          </div>
          <button onClick={onEnableNotifications} className="btn-modern touch-feedback">
            enable on this device
          </button>
        </div>

        <div className="p-4 bg-glass border border-border-glass rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-medium text-text-primary">beacon pairing</h3>
              <p className="text-xs text-text-muted mt-1">pair your iBeacon tag to your account</p>
            </div>
            <button className="btn-modern touch-feedback" onClick={onScanAndPair}>
              pair new beacon
            </button>
          </div>
          <div className="space-y-2">
            {myBeacons?.length ? (
              myBeacons.map((b: any) => (
                <div
                  key={b._id}
                  className="flex items-center justify-between p-3 bg-glass border border-border-glass rounded-lg"
                >
                  <div>
                    <div className="font-medium">{b.label || b.key}</div>
                    <div className="text-xs text-text-dim">{b.key}</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-modern touch-feedback" onClick={() => onRenameBeacon(b)}>
                      rename
                    </button>
                    <button className="btn-modern btn-danger touch-feedback" onClick={() => onUnpairBeacon(b)}>
                      unpair
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-text-muted">no beacons paired</div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center p-4 bg-glass border border-border-glass rounded-xl">
          <div>
            <h3 className="text-sm font-medium text-text-primary">dark mode</h3>
            <p className="text-xs text-text-muted mt-1">always enabled for optimal experience</p>
          </div>
          <Toggle enabled={true} onChange={() => {}} disabled />
        </div>
      </div>
    </div>
  );
}
