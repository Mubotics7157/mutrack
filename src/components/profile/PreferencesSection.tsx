import { Bell, Bluetooth, Moon, Pencil, Trash2, MessageSquare } from 'lucide-react';
import { Toggle, Button } from '../ui';

interface PreferencesSectionProps {
  onEnableNotifications: () => void;
  onScanAndPair: () => void;
  myBeacons: any[] | undefined;
  onRenameBeacon: (beacon: any) => void;
  onUnpairBeacon: (beacon: any) => void;
  smsCheckInEnabled?: boolean;
  onToggleSmsCheckIn?: (enabled: boolean) => void;
}

export function PreferencesSection({
  onEnableNotifications,
  onScanAndPair,
  myBeacons,
  onRenameBeacon,
  onUnpairBeacon,
  smsCheckInEnabled = true,
  onToggleSmsCheckIn,
}: PreferencesSectionProps) {
  return (
    <section className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border-subtle">
        <h2 className="text-lg font-semibold text-text-primary">Preferences</h2>
      </div>

      <div className="divide-y divide-border-subtle">
        {/* Meeting Reminders */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <Bell size={20} className="text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-text-primary">Meeting Reminders</h3>
              <p className="text-xs text-text-muted mt-0.5">Enable web push notifications on this device</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={onEnableNotifications}>
            Enable
          </Button>
        </div>

        {/* Beacon Pairing */}
        <div className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent-orange/10 flex items-center justify-center shrink-0">
                <Bluetooth size={20} className="text-accent-orange" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-text-primary">Beacon Pairing</h3>
                <p className="text-xs text-text-muted mt-0.5">Pair your iBeacon tag to your account</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={onScanAndPair}>
              Pair New
            </Button>
          </div>

          {myBeacons?.length ? (
            <div className="space-y-2 ml-0 sm:ml-[52px]">
              {myBeacons.map((b: any) => (
                <div
                  key={b._id}
                  className="flex items-center justify-between p-3 bg-bg-tertiary border border-border rounded-lg"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">{b.label || b.key}</div>
                    <div className="text-xs text-text-dim font-mono truncate">{b.key}</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Pencil size={14} />}
                      onClick={() => onRenameBeacon(b)}
                    >
                      <span className="sr-only sm:not-sr-only">Rename</span>
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<Trash2 size={14} />}
                      onClick={() => onUnpairBeacon(b)}
                    >
                      <span className="sr-only sm:not-sr-only">Unpair</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted ml-0 sm:ml-[52px]">No beacons paired yet</p>
          )}
        </div>

        {/* SMS Check-In */}
        <div className="flex items-center justify-between gap-4 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-success/10 flex items-center justify-center shrink-0">
              <MessageSquare size={20} className="text-accent-success" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-text-primary">SMS Check-In</h3>
              <p className="text-xs text-text-muted mt-0.5">
                Receive check-in links via SMS if you don't have a beacon
              </p>
            </div>
          </div>
          <Toggle
            enabled={smsCheckInEnabled}
            onChange={(enabled) => onToggleSmsCheckIn?.(enabled)}
          />
        </div>

        {/* Dark Mode */}
        <div className="flex items-center justify-between gap-4 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-text-dim/10 flex items-center justify-center shrink-0">
              <Moon size={20} className="text-text-muted" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-text-primary">Dark Mode</h3>
              <p className="text-xs text-text-muted mt-0.5">Always enabled for optimal experience</p>
            </div>
          </div>
          <Toggle enabled={true} onChange={() => {}} disabled />
        </div>
      </div>
    </section>
  );
}
