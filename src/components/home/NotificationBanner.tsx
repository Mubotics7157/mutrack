import { Bell } from 'lucide-react';
import { Button } from '../ui';

interface NotificationBannerProps {
  onEnable: () => void;
}

export function NotificationBanner({ onEnable }: NotificationBannerProps) {
  return (
    <div className="bg-bg-secondary border border-border rounded-xl p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
            <Bell size={18} className="text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-text-primary">
              Enable Meeting Notifications
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Get alerts on this device when meetings are scheduled and before they start.
            </p>
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={onEnable}>
          Enable
        </Button>
      </div>
    </div>
  );
}
