import React from 'react';
import { Plus } from 'lucide-react';

interface QuickActionsProps {
  onNewMeeting: () => void;
  onQuickMeeting: (date: Date) => void;
}

export function QuickActions({ onNewMeeting, onQuickMeeting }: QuickActionsProps) {
  const handleTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(16, 0, 0, 0);
    onQuickMeeting(tomorrow);
  };

  const handleNextWeek = () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(16, 0, 0, 0);
    onQuickMeeting(nextWeek);
  };

  return (
    <div className="flex gap-2 flex-wrap">
      <button
        className="btn-modern btn-primary flex items-center gap-2 touch-feedback"
        onClick={onNewMeeting}
      >
        <Plus size={16} />
        <span>schedule meeting</span>
      </button>
      <button
        className="btn-modern flex items-center gap-2 touch-feedback"
        onClick={handleTomorrow}
      >
        <Plus size={16} />
        <span>quick: tomorrow 4pm</span>
      </button>
      <button
        className="btn-modern flex items-center gap-2 touch-feedback"
        onClick={handleNextWeek}
      >
        <Plus size={16} />
        <span>quick: next week</span>
      </button>
    </div>
  );
}
