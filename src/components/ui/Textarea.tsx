import React from 'react';
import { cn } from '../../lib/utils';

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
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium text-text-secondary"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
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
