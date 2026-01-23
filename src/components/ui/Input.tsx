import React from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export function Input({
  label,
  error,
  hint,
  icon,
  iconPosition = 'left',
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-text-secondary"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && iconPosition === 'left' && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={cn(
            // Base styles
            'w-full bg-bg-tertiary border rounded-lg text-text-primary',
            'placeholder:text-text-dim',
            'transition-all duration-200',
            // Focus state
            'focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none',
            // Size (16px font prevents iOS zoom)
            'min-h-[48px] px-4 text-base',
            // Icon padding
            icon && iconPosition === 'left' && 'pl-12',
            icon && iconPosition === 'right' && 'pr-12',
            // Error state
            error
              ? 'border-accent-error focus:border-accent-error focus:ring-accent-error/20'
              : 'border-border',
            className
          )}
          {...props}
        />
        {icon && iconPosition === 'right' && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            {icon}
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-accent-error">{error}</p>
      )}
      {hint && !error && (
        <p className="text-sm text-text-muted">{hint}</p>
      )}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({
  label,
  error,
  hint,
  className,
  id,
  rows = 4,
  ...props
}: TextareaProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-text-secondary"
        >
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        rows={rows}
        className={cn(
          // Base styles
          'w-full bg-bg-tertiary border rounded-lg text-text-primary resize-none',
          'placeholder:text-text-dim',
          'transition-all duration-200',
          // Focus state
          'focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none',
          // Size
          'p-4 text-base',
          // Error state
          error
            ? 'border-accent-error focus:border-accent-error focus:ring-accent-error/20'
            : 'border-border',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-accent-error">{error}</p>
      )}
      {hint && !error && (
        <p className="text-sm text-text-muted">{hint}</p>
      )}
    </div>
  );
}
