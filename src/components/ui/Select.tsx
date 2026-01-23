import React from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

export function Select({
  label,
  error,
  hint,
  options,
  placeholder,
  className,
  id,
  disabled,
  ...props
}: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-text-secondary"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          disabled={disabled}
          className={cn(
            // Base styles
            'w-full bg-bg-tertiary border rounded-lg text-text-primary',
            'transition-all duration-200 appearance-none cursor-pointer',
            // Focus state
            'focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none',
            // Size (16px font prevents iOS zoom)
            'min-h-[48px] px-4 pr-12 text-base',
            // Error state
            error
              ? 'border-accent-error focus:border-accent-error focus:ring-accent-error/20'
              : 'border-border',
            // Disabled state
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="text-text-dim">
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className="bg-bg-primary text-text-primary"
            >
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
          <ChevronDown size={20} />
        </div>
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
