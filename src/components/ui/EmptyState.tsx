import React from 'react';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  size = 'md',
  className,
}: EmptyStateProps) {
  const sizeClasses = {
    sm: {
      container: 'py-8',
      icon: 'w-10 h-10 mb-3',
      title: 'text-base',
      description: 'text-sm',
    },
    md: {
      container: 'py-12',
      icon: 'w-12 h-12 mb-4',
      title: 'text-lg',
      description: 'text-sm',
    },
    lg: {
      container: 'py-16',
      icon: 'w-16 h-16 mb-5',
      title: 'text-xl',
      description: 'text-base',
    },
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center px-4',
        sizeClasses[size].container,
        className
      )}
    >
      {icon && (
        <div className={cn('text-text-dim', sizeClasses[size].icon)}>
          {React.isValidElement(icon)
            ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
                className: cn('w-full h-full', (icon as React.ReactElement<{ className?: string }>).props.className),
              })
            : icon}
        </div>
      )}
      <h3 className={cn('font-medium text-text-secondary', sizeClasses[size].title)}>
        {title}
      </h3>
      {description && (
        <p className={cn('text-text-muted mt-2 max-w-sm', sizeClasses[size].description)}>
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
