import React from 'react';
import { cn } from '../../lib/utils';

export type BadgeVariant =
  | 'default'
  | 'accent'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  // Status variants
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'ordered'
  | 'fulfilled'
  // Role variants
  | 'admin'
  | 'lead'
  | 'member';

export type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-bg-tertiary text-text-secondary',
  accent: 'bg-accent-dim text-accent',
  success: 'bg-success-dim text-accent-success',
  warning: 'bg-warning-dim text-accent-warning',
  error: 'bg-error-dim text-accent-error',
  info: 'bg-info-dim text-accent-info',
  // Status mappings
  pending: 'bg-warning-dim text-accent-warning',
  approved: 'bg-success-dim text-accent-success',
  rejected: 'bg-error-dim text-accent-error',
  ordered: 'bg-info-dim text-accent-info',
  fulfilled: 'bg-accent-dim text-accent',
  // Role mappings
  admin: 'bg-error-dim text-role-admin',
  lead: 'bg-warning-dim text-role-lead',
  member: 'bg-info-dim text-role-member',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {dot && (
        <span className={cn(
          'w-1.5 h-1.5 rounded-full',
          variant === 'success' || variant === 'approved' ? 'bg-accent-success' :
          variant === 'warning' || variant === 'pending' ? 'bg-accent-warning' :
          variant === 'error' || variant === 'rejected' ? 'bg-accent-error' :
          variant === 'info' || variant === 'ordered' ? 'bg-accent-info' :
          variant === 'accent' || variant === 'fulfilled' ? 'bg-accent' :
          'bg-text-muted'
        )} />
      )}
      {children}
    </span>
  );
}

// Convenience component for role badges
export function RoleBadge({ role }: { role: 'admin' | 'lead' | 'member' }) {
  return (
    <Badge variant={role} size="sm">
      {role}
    </Badge>
  );
}
