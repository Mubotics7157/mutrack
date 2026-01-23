import React from 'react';
import { cn } from '../../lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    positive: boolean;
  };
  variant?: 'default' | 'compact';
  className?: string;
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  variant = 'default',
  className,
}: StatCardProps) {
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-3 p-3 bg-bg-secondary rounded-lg border border-border', className)}>
        {icon && (
          <div className="shrink-0 text-accent">{icon}</div>
        )}
        <div className="min-w-0">
          <p className="text-lg font-semibold text-text-primary truncate">{value}</p>
          <p className="text-xs text-text-muted truncate">{label}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('p-4 bg-bg-secondary rounded-xl border border-border text-center', className)}>
      {icon && (
        <div className="mb-3 flex justify-center text-accent">{icon}</div>
      )}
      <p className="text-2xl font-semibold text-text-primary">{value}</p>
      <p className="text-sm text-text-muted mt-1">{label}</p>
      {trend && (
        <div className={cn(
          'flex items-center justify-center gap-1 mt-2 text-sm',
          trend.positive ? 'text-accent-success' : 'text-accent-error'
        )}>
          {trend.positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{trend.positive ? '+' : ''}{trend.value}%</span>
        </div>
      )}
    </div>
  );
}

interface StatRowProps {
  stats: Array<{
    label: string;
    value: string | number;
    icon?: React.ReactNode;
    trend?: { value: number; positive: boolean };
  }>;
  variant?: 'default' | 'scroll';
  className?: string;
}

export function StatRow({ stats, variant = 'default', className }: StatRowProps) {
  if (variant === 'scroll') {
    return (
      <div className={cn('scroll-x pb-2', className)}>
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} variant="compact" className="min-w-[140px]" />
        ))}
      </div>
    );
  }

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
  };

  const cols = Math.min(stats.length, 4) as 1 | 2 | 3 | 4;

  return (
    <div className={cn('grid gap-3', gridCols[cols], className)}>
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
}
