import React from 'react';
import { cn } from '../../lib/utils';

export type BadgeVariant =
  | 'default'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'ordered'
  | 'fulfilled'
  | 'admin'
  | 'lead'
  | 'member';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-glass border-border-glass text-text-secondary',
  pending: 'badge-pending',
  approved: 'badge-approved',
  rejected: 'badge-rejected',
  ordered: 'badge-ordered',
  fulfilled: 'badge-fulfilled',
  admin: 'badge-role-admin',
  lead: 'badge-role-lead',
  member: 'badge-role-member',
};

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span className={cn('badge', variantClasses[variant], className)}>
      {children}
    </span>
  );
}
