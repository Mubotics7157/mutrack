import React from 'react';
import { cn } from '../../lib/utils';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  gradient?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function SectionHeader({
  title,
  subtitle,
  action,
  gradient = false,
  className,
  children,
}: SectionHeaderProps) {
  return (
    <div className={cn('section-header', className)}>
      {gradient && (
        <div className="absolute inset-0 bg-gradient-to-br from-sunset-orange/5 to-accent-purple/5 pointer-events-none" />
      )}
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className={cn(
              'text-heading-lg font-semibold',
              gradient ? 'text-gradient' : 'text-text-primary'
            )}>
              {title}
            </h2>
            {subtitle && (
              <p className="text-body-md text-text-muted mt-1">{subtitle}</p>
            )}
          </div>
          {action && (
            <div className="flex-shrink-0">{action}</div>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
