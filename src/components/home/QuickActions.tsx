import React from 'react';
import { Plus, Calendar } from 'lucide-react';
import { Button } from '../ui';

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
    <section className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap scrollbar-hide">
      <Button
        variant="primary"
        size="sm"
        icon={<Plus size={16} />}
        onClick={onNewMeeting}
        className="shrink-0"
      >
        New Meeting
      </Button>
      <Button
        variant="secondary"
        size="sm"
        icon={<Calendar size={16} />}
        onClick={handleTomorrow}
        className="shrink-0"
      >
        Tomorrow 4pm
      </Button>
      <Button
        variant="secondary"
        size="sm"
        icon={<Calendar size={16} />}
        onClick={handleNextWeek}
        className="shrink-0"
      >
        Next Week
      </Button>
    </section>
  );
}
