import React from 'react';
import { cn } from '../../lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    positive: boolean;
  };
  className?: string;
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <div className={cn('stat-card', className)}>
      {icon && (
        <div className="mb-2 text-sunset-orange">{icon}</div>
      )}
      <p className="text-heading-lg font-bold text-text-primary">{value}</p>
      <p className="text-label uppercase text-text-muted mt-1">{label}</p>
      {trend && (
        <p className={cn(
          'text-body-sm mt-2',
          trend.positive ? 'text-accent-green' : 'text-error-red'
        )}>
          {trend.positive ? '+' : ''}{trend.value}%
        </p>
      )}
    </div>
  );
}

interface StatRowProps {
  stats: Array<{
    label: string;
    value: string | number;
    icon?: React.ReactNode;
  }>;
  className?: string;
}

export function StatRow({ stats, className }: StatRowProps) {
  return (
    <div className={cn('grid gap-4', `grid-cols-${Math.min(stats.length, 4)}`, className)}>
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
}
