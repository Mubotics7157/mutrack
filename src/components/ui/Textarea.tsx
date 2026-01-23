import React from 'react';
import { cn } from '../../lib/utils';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({
  label,
  error,
  className,
  id,
  ...props
}: TextareaProps) {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-label uppercase text-text-muted"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={cn(
          'input-modern min-h-[100px] resize-y',
          error && 'border-error-red focus:border-error-red',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-body-sm text-error-red">{error}</p>
      )}
    </div>
  );
}
