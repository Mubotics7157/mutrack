import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white hover:bg-accent/90 active:bg-accent/80',
  secondary: 'bg-bg-tertiary text-text-primary border border-border hover:bg-bg-hover hover:border-border-glass-hover',
  ghost: 'bg-transparent text-text-secondary hover:bg-bg-hover hover:text-text-primary',
  danger: 'bg-accent-error text-white hover:bg-accent-error/90 active:bg-accent-error/80',
  success: 'bg-accent-success text-white hover:bg-accent-success/90 active:bg-accent-success/80',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-[36px] px-3 text-sm gap-1.5',
  md: 'min-h-[44px] px-4 text-sm gap-2',
  lg: 'min-h-[52px] px-6 text-base gap-2',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={cn(
        // Base styles
        'inline-flex items-center justify-center font-medium rounded-lg',
        'transition-all duration-200 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary',
        'active:scale-[0.98]',
        // Variant
        variantClasses[variant],
        // Size
        sizeClasses[size],
        // States
        isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        fullWidth && 'w-full',
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          <span>{children}</span>
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </button>
  );
}
