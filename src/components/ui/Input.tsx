import React from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({
  label,
  error,
  icon,
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
          className="block text-label uppercase text-text-muted"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={cn(
            'input-modern',
            icon && 'pl-12',
            error && 'border-error-red focus:border-error-red focus:shadow-[0_0_0_1px_rgba(247,100,100,0.5),0_0_20px_rgba(247,100,100,0.2)]',
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="text-body-sm text-error-red">{error}</p>
      )}
    </div>
  );
}
