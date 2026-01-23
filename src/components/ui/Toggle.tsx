import React from 'react';
import { cn } from '../../lib/utils';

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function Toggle({
  enabled,
  onChange,
  label,
  description,
  disabled = false,
  className,
}: ToggleProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      {(label || description) && (
        <div className="flex-1 mr-4">
          {label && (
            <p className="text-body-md text-text-primary">{label}</p>
          )}
          {description && (
            <p className="text-body-sm text-text-muted">{description}</p>
          )}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={disabled}
        onClick={() => onChange(!enabled)}
        className={cn(
          'relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300',
          'border border-border-glass',
          enabled ? 'bg-sunset-orange' : 'bg-glass',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && 'cursor-pointer touch-feedback'
        )}
      >
        <span
          className={cn(
            'inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300',
            'shadow-[0_2px_4px_rgba(0,0,0,0.2)]',
            enabled ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  );
}
