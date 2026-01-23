import React from 'react';
import { cn } from '../../lib/utils';
import { Search, X } from 'lucide-react';

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onClear?: () => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
  size = 'md',
  className,
  ...props
}: SearchInputProps) {
  const hasValue = value && String(value).length > 0;

  const sizeClasses = {
    sm: 'min-h-[40px] text-sm pl-10 pr-9',
    md: 'min-h-[48px] text-base pl-12 pr-10',
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4 left-3',
    md: 'w-5 h-5 left-4',
  };

  return (
    <div className={cn('relative', className)}>
      <Search
        className={cn(
          'absolute top-1/2 -translate-y-1/2 text-text-muted pointer-events-none',
          iconSizeClasses[size]
        )}
      />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={cn(
          'w-full bg-bg-tertiary border border-border rounded-lg text-text-primary',
          'placeholder:text-text-dim',
          'transition-all duration-200',
          'focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none',
          sizeClasses[size]
        )}
        {...props}
      />
      {hasValue && onClear && (
        <button
          type="button"
          onClick={onClear}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary',
            'transition-colors p-1 rounded',
            size === 'sm' ? 'right-2' : 'right-3'
          )}
        >
          <X className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} />
        </button>
      )}
    </div>
  );
}
