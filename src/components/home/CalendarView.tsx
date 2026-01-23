import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CalendarViewProps {
  meetings: any[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onDateDoubleClick?: (date: Date) => void;
  viewMode: 'month' | 'week';
}

export function CalendarView({
  meetings,
  selectedDate,
  onDateSelect,
  onDateDoubleClick,
  viewMode,
}: CalendarViewProps) {
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getWeekDays = (date: Date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    const days: Date[] = [];

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }

    return days;
  };

  const days = viewMode === 'month' ? getDaysInMonth(selectedDate) : getWeekDays(selectedDate);

  const getMeetingsForDate = (date: Date | null) => {
    if (!date) return [];
    return meetings.filter((m: any) => {
      const meetingDate = new Date(m.date);
      return meetingDate.toDateString() === date.toDateString();
    });
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    return new Date().toDateString() === date.toDateString();
  };

  const isSelected = (date: Date | null) => {
    if (!date) return false;
    return selectedDate.toDateString() === date.toDateString();
  };

  const handlePrevious = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'month') {
      newDate.setMonth(selectedDate.getMonth() - 1);
    } else {
      newDate.setDate(selectedDate.getDate() - 7);
    }
    onDateSelect(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'month') {
      newDate.setMonth(selectedDate.getMonth() + 1);
    } else {
      newDate.setDate(selectedDate.getDate() + 7);
    }
    onDateSelect(newDate);
  };

  return (
    <div>
      {/* Month/Week Header */}
      <div className="flex justify-between items-center mb-4">
        <button
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
          onClick={handlePrevious}
        >
          <ChevronLeft size={18} />
        </button>

        <h3 className="text-base font-medium text-text-primary">
          {selectedDate.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          })}
        </h3>

        <button
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
          onClick={handleNext}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day Labels */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-text-muted py-2"
          >
            <span className="hidden md:inline">{day}</span>
            <span className="md:hidden">{day.charAt(0)}</span>
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          const dayMeetings = date ? getMeetingsForDate(date) : [];
          const hasMeetings = dayMeetings.length > 0;

          return (
            <button
              key={index}
              onClick={() => date && onDateSelect(date)}
              onDoubleClick={() => date && onDateDoubleClick?.(date)}
              disabled={!date}
              title={
                date && onDateDoubleClick
                  ? `Double-click to add meeting on ${date.toLocaleDateString()}`
                  : undefined
              }
              className={cn(
                'aspect-square flex flex-col items-center justify-center rounded-lg transition-all duration-200',
                'text-sm font-medium',
                // Base state
                date ? 'hover:bg-bg-hover cursor-pointer' : 'opacity-0 cursor-default',
                // Today
                date && isToday(date) && 'bg-accent text-white hover:bg-accent/90',
                // Selected (not today)
                date && isSelected(date) && !isToday(date) && 'bg-bg-tertiary ring-2 ring-accent/50',
                // Has meetings (not today)
                date && hasMeetings && !isToday(date) && 'text-accent-success',
                // Default text
                date && !isToday(date) && !hasMeetings && 'text-text-secondary'
              )}
            >
              {date && (
                <>
                  <span>{date.getDate()}</span>
                  {hasMeetings && !isToday(date) && (
                    <span className="w-1 h-1 rounded-full bg-accent-success mt-0.5" />
                  )}
                  {hasMeetings && isToday(date) && (
                    <span className="w-1 h-1 rounded-full bg-white mt-0.5" />
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
