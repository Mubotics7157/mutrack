import React from 'react';
import { cn } from '../../lib/utils';

export type CardVariant = 'default' | 'elevated' | 'interactive' | 'outlined';

interface CardProps {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-bg-secondary border border-border',
  elevated: 'bg-bg-tertiary border border-border shadow-md',
  interactive: 'bg-bg-secondary border border-border hover:bg-bg-tertiary hover:border-border-glass-hover cursor-pointer active:scale-[0.99] transition-transform',
  outlined: 'bg-transparent border border-border',
};

const paddingClasses: Record<string, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({
  variant = 'default',
  padding = 'md',
  className,
  children,
  onClick,
}: CardProps) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      className={cn(
        'rounded-xl transition-all duration-200',
        variantClasses[variant],
        paddingClasses[padding],
        onClick && 'w-full text-left',
        className
      )}
      onClick={onClick}
    >
      {children}
    </Component>
  );
}

interface CardHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export function CardHeader({ className, children }: CardHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  as?: 'h1' | 'h2' | 'h3' | 'h4';
  className?: string;
  children: React.ReactNode;
}

export function CardTitle({ as: Component = 'h3', className, children }: CardTitleProps) {
  return (
    <Component className={cn('text-lg font-semibold text-text-primary', className)}>
      {children}
    </Component>
  );
}

interface CardDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

export function CardDescription({ className, children }: CardDescriptionProps) {
  return (
    <p className={cn('text-sm text-text-secondary', className)}>
      {children}
    </p>
  );
}

interface CardContentProps {
  className?: string;
  children: React.ReactNode;
}

export function CardContent({ className, children }: CardContentProps) {
  return <div className={cn(className)}>{children}</div>;
}

interface CardFooterProps {
  className?: string;
  children: React.ReactNode;
}

export function CardFooter({ className, children }: CardFooterProps) {
  return (
    <div className={cn('flex items-center gap-3 mt-4 pt-4 border-t border-border-subtle', className)}>
      {children}
    </div>
  );
}
