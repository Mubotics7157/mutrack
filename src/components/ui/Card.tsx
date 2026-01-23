import React from 'react';
import { cn } from '../../lib/utils';

export type CardVariant = 'default' | 'interactive' | 'feature' | 'glass';

interface CardProps {
  variant?: CardVariant;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

const variantClasses: Record<CardVariant, string> = {
  default: 'card-modern',
  interactive: 'card-interactive',
  feature: 'glass-panel',
  glass: 'bg-glass backdrop-blur-md border border-border-glass rounded-2xl',
};

export function Card({ variant = 'default', className, children, onClick }: CardProps) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      className={cn(variantClasses[variant], className)}
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
    <div className={cn('mb-4', className)}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  className?: string;
  children: React.ReactNode;
}

export function CardTitle({ className, children }: CardTitleProps) {
  return (
    <h3 className={cn('text-heading-md font-semibold text-text-primary', className)}>
      {children}
    </h3>
  );
}

interface CardContentProps {
  className?: string;
  children: React.ReactNode;
}

export function CardContent({ className, children }: CardContentProps) {
  return (
    <div className={cn(className)}>
      {children}
    </div>
  );
}
