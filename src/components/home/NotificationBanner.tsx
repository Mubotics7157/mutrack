import React from 'react';

interface NotificationBannerProps {
  onEnable: () => void;
}

export function NotificationBanner({ onEnable }: NotificationBannerProps) {
  return (
    <div className="glass-panel p-4 border border-border-glass">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-text-primary">
            enable meeting notifications
          </h3>
          <p className="text-xs text-text-muted mt-1">
            get alerts on this device when meetings are scheduled and before
            they start.
          </p>
        </div>
        <button className="btn-modern touch-feedback" onClick={onEnable}>
          enable
        </button>
      </div>
    </div>
  );
}
