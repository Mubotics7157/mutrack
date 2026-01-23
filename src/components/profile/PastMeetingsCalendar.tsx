import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';

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
      <div className="flex justify-between items-center mb-6">
        <button
          className="btn-modern w-10 h-10 p-0 flex items-center justify-center touch-feedback"
          onClick={handlePrevious}
        >
          <ChevronLeft size={16} />
        </button>

        <h3 className="text-lg font-mono text-text-secondary">
          {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toLowerCase()}
        </h3>

        <button
          className="btn-modern w-10 h-10 p-0 flex items-center justify-center touch-feedback"
          onClick={handleNext}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="flex justify-end mb-4">
        <button className="btn-modern touch-feedback" onClick={() => setViewMode(viewMode === 'month' ? 'week' : 'month')}>
          {viewMode === 'month' ? 'week view' : 'month view'}
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((day) => (
          <div key={day} className="text-center text-xs text-text-muted font-mono py-1 md:py-2">
            <span className="hidden md:inline">{day}</span>
            <span className="md:hidden">{day.charAt(0)}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5 md:gap-1 bg-border-glass p-0.5 md:p-1 rounded-xl">
        {days.map((date, index) => {
          const dayMeetings = date ? getMeetingsForDate(date) : [];
          return (
            <div
              key={index}
              className={`
                calendar-day relative
                ${date && isToday(date) ? 'today' : ''}
                ${dayMeetings.length > 0 ? 'has-event' : ''}
              `}
              style={{
                cursor: date ? 'pointer' : 'default',
                opacity: date ? 1 : 0.3,
              }}
            >
              {date && (
                <>
                  <span className="text-xs md:text-sm font-light">{date.getDate()}</span>
                  {dayMeetings.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {dayMeetings.slice(0, 2).map((m, idx) => (
                        <div key={idx} className="text-[9px] md:text-[10px] text-accent-green">
                          <div className="font-mono">
                            <Clock size={10} className="inline mr-1" />
                            {m.startTime}
                          </div>
                          {m.location && (
                            <div className="text-text-dim truncate hidden md:block">
                              <MapPin size={10} className="inline mr-1" />
                              {m.location}
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
