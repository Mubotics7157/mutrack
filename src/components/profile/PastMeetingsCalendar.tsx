import { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, MapPin, Calendar } from 'lucide-react';
import { Button } from '../ui';
import { cn } from '../../lib/utils';

interface PastMeetingsCalendarProps {
  meetings: Array<{
    _id: string;
    title: string;
    description?: string;
    date: number;
    startTime: string;
    endTime: string;
    location?: string;
  }>;
}

export function PastMeetingsCalendar({ meetings }: PastMeetingsCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
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
    return meetings.filter((m) => {
      const meetingDate = new Date(m.date);
      return meetingDate.toDateString() === date.toDateString();
    });
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    return new Date().toDateString() === date.toDateString();
  };

  const handlePrevious = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'month') newDate.setMonth(selectedDate.getMonth() - 1);
    else newDate.setDate(selectedDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'month') newDate.setMonth(selectedDate.getMonth() + 1);
    else newDate.setDate(selectedDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            className="w-9 h-9 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
            onClick={handlePrevious}
          >
            <ChevronLeft size={18} />
          </button>
          <h3 className="text-base font-medium text-text-primary min-w-[140px] text-center">
            {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <button
            className="w-9 h-9 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
            onClick={handleNext}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          icon={<Calendar size={14} />}
          onClick={() => setViewMode(viewMode === 'month' ? 'week' : 'month')}
        >
          {viewMode === 'month' ? 'Week' : 'Month'}
        </Button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-xs text-text-muted py-2">
            <span className="hidden md:inline">{day}</span>
            <span className="md:hidden">{day.charAt(0)}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          const dayMeetings = date ? getMeetingsForDate(date) : [];
          const hasMeetings = dayMeetings.length > 0;

          return (
            <div
              key={index}
              className={cn(
                'min-h-[60px] md:min-h-[80px] p-1.5 rounded-lg transition-colors',
                date ? 'bg-bg-tertiary hover:bg-bg-hover cursor-pointer' : 'opacity-30',
                date && isToday(date) && 'ring-2 ring-accent bg-accent/10',
                hasMeetings && 'border border-accent-success/30'
              )}
            >
              {date && (
                <>
                  <span
                    className={cn(
                      'text-xs font-medium',
                      isToday(date) ? 'text-accent' : 'text-text-primary'
                    )}
                  >
                    {date.getDate()}
                  </span>
                  {hasMeetings && (
                    <div className="mt-1 space-y-0.5">
                      {dayMeetings.slice(0, 2).map((m, idx) => (
                        <div key={idx} className="text-[9px] md:text-[10px] text-accent-success">
                          <div className="flex items-center gap-0.5">
                            <Clock size={8} className="shrink-0" />
                            <span>{m.startTime}</span>
                          </div>
                          {m.location && (
                            <div className="text-text-dim truncate hidden md:flex items-center gap-0.5">
                              <MapPin size={8} className="shrink-0" />
                              <span className="truncate">{m.location}</span>
                            </div>
                          )}
                        </div>
                      ))}
                      {dayMeetings.length > 2 && (
                        <div className="text-[9px] text-text-dim">+{dayMeetings.length - 2} more</div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
