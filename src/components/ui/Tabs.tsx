import React from 'react';
import { cn } from '../../lib/utils';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange?: (tabId: string) => void;
  onTabChange?: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underline' | 'segment';
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  className?: string;
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  onTabChange,
  variant = 'default',
  size = 'md',
  fullWidth = false,
  className,
}: TabsProps) {
  const handleChange = onTabChange ?? onChange ?? (() => {});
  const containerClasses = {
    default: 'flex gap-1',
    pills: 'flex gap-2',
    underline: 'flex gap-4 border-b border-border-subtle',
    segment: 'flex gap-1 p-1 bg-bg-tertiary rounded-lg',
  };

  const tabClasses = {
    default: {
      base: 'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
      active: 'bg-bg-tertiary text-text-primary',
      inactive: 'text-text-muted hover:text-text-primary hover:bg-bg-hover',
    },
    pills: {
      base: 'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
      active: 'bg-accent text-white',
      inactive: 'text-text-muted hover:text-text-primary hover:bg-bg-hover',
    },
    underline: {
      base: 'px-1 py-3 text-sm font-medium transition-all duration-200 border-b-2 -mb-px',
      active: 'border-accent text-text-primary',
      inactive: 'border-transparent text-text-muted hover:text-text-primary hover:border-text-muted',
    },
    segment: {
      base: 'flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 text-center',
      active: 'bg-bg-primary text-text-primary shadow-sm',
      inactive: 'text-text-muted hover:text-text-primary',
    },
  };

  const sizeClasses = {
    sm: 'min-h-[36px]',
    md: 'min-h-[44px]',
  };

  return (
    <div
      className={cn(
        containerClasses[variant],
        fullWidth && 'w-full',
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => !tab.disabled && handleChange(tab.id)}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-disabled={tab.disabled}
          className={cn(
            tabClasses[variant].base,
            sizeClasses[size],
            activeTab === tab.id
              ? tabClasses[variant].active
              : tabClasses[variant].inactive,
            tab.disabled && 'opacity-50 cursor-not-allowed',
            fullWidth && variant !== 'segment' && 'flex-1',
            'flex items-center justify-center gap-2'
          )}
        >
          {tab.icon}
          <span>{tab.label}</span>
          {tab.count !== undefined && (
            <span
              className={cn(
                'px-1.5 py-0.5 rounded-full text-xs',
                activeTab === tab.id
                  ? variant === 'pills' ? 'bg-white/20' : 'bg-accent-dim text-accent'
                  : 'bg-bg-tertiary text-text-muted'
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
