import React from 'react';
import { cn } from '../../lib/utils';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-4', className)}>
      <div>
        <h2 className="text-lg font-semibold text-text-primary">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-text-muted mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && (
        <div className="shrink-0">{action}</div>
      )}
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backButton?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  backButton,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('mb-6', className)}>
      <div className="flex items-center gap-3 mb-1">
        {backButton}
        <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
      </div>
      {subtitle && (
        <p className="text-sm text-text-secondary">{subtitle}</p>
      )}
      {actions && (
        <div className="flex items-center gap-2 mt-4">{actions}</div>
      )}
    </div>
  );
}
