import React from 'react';
import { cn } from '../../lib/utils';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  className?: string;
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = 'default',
  className,
}: TabsProps) {
  const baseClasses = 'flex gap-2';

  const tabBaseClasses = {
    default: 'px-4 py-2 rounded-lg text-body-md transition-all duration-300',
    pills: 'px-4 py-2 rounded-full text-body-md transition-all duration-300',
    underline: 'px-4 py-3 text-body-md transition-all duration-300 border-b-2 -mb-px',
  };

  const tabActiveClasses = {
    default: 'bg-glass-hover text-text-primary',
    pills: 'bg-gradient-orange-purple text-void-black font-medium',
    underline: 'border-sunset-orange text-text-primary',
  };

  const tabInactiveClasses = {
    default: 'text-text-muted hover:text-text-primary hover:bg-glass',
    pills: 'text-text-muted hover:text-text-primary',
    underline: 'border-transparent text-text-muted hover:text-text-primary',
  };

  return (
    <div className={cn(
      baseClasses,
      variant === 'underline' && 'border-b border-border-glass',
      className
    )}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            tabBaseClasses[variant],
            activeTab === tab.id
              ? tabActiveClasses[variant]
              : tabInactiveClasses[variant],
            'touch-feedback'
          )}
        >
          <span className="flex items-center gap-2">
            {tab.icon}
            <span className="lowercase tracking-wider">{tab.label}</span>
            {tab.count !== undefined && (
              <span className={cn(
                'ml-1 px-2 py-0.5 rounded-full text-xs',
                activeTab === tab.id
                  ? 'bg-white/20'
                  : 'bg-glass'
              )}>
                {tab.count}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
