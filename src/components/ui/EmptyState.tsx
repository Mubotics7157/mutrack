import React from 'react';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('empty-state', className)}>
      {icon && (
        <div className="mb-4 text-text-dim">
          {icon}
        </div>
      )}
      <h3 className="text-heading-sm text-text-primary mb-2">{title}</h3>
      {description && (
        <p className="text-body-md text-text-muted mb-6 max-w-sm">{description}</p>
      )}
      {action}
    </div>
  );
}
