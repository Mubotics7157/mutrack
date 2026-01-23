import React from 'react';
import { cn } from '../../lib/utils';

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function Toggle({
  enabled,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  className,
}: ToggleProps) {
  const sizeClasses = {
    sm: {
      track: 'h-5 w-9',
      thumb: 'h-3.5 w-3.5',
      translate: enabled ? 'translate-x-4' : 'translate-x-0.5',
    },
    md: {
      track: 'h-6 w-11',
      thumb: 'h-4 w-4',
      translate: enabled ? 'translate-x-5' : 'translate-x-0.5',
    },
  };

  return (
    <label
      className={cn(
        'flex items-center justify-between gap-4',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        className
      )}
    >
      {(label || description) && (
        <div className="flex-1">
          {label && (
            <p className="text-sm font-medium text-text-primary">{label}</p>
          )}
          {description && (
            <p className="text-sm text-text-muted mt-0.5">{description}</p>
          )}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={disabled}
        onClick={() => !disabled && onChange(!enabled)}
        className={cn(
          'relative inline-flex shrink-0 items-center rounded-full',
          'transition-colors duration-200 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary',
          sizeClasses[size].track,
          enabled ? 'bg-accent' : 'bg-bg-hover border border-border',
          !disabled && 'active:scale-95'
        )}
      >
        <span
          className={cn(
            'inline-block rounded-full bg-white shadow-sm',
            'transition-transform duration-200 ease-out',
            sizeClasses[size].thumb,
            sizeClasses[size].translate
          )}
        />
      </button>
    </label>
  );
}
