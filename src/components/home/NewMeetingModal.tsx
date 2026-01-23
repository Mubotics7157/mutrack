import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { MemberWithProfile } from '../../lib/members';
import { toast } from 'sonner';
import { Plus, MapPin, X, Trash2, Calendar } from 'lucide-react';
import { Button, Input, Textarea } from '../ui';
import { cn } from '../../lib/utils';

type DayOfWeek = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

interface ScheduleSlot {
  id: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
}

interface NewMeetingModalProps {
  onClose: () => void;
  member: MemberWithProfile;
  defaultDate?: Date | null;
}

const DAYS: { key: DayOfWeek; label: string; short: string }[] = [
  { key: 'sun', label: 'Sunday', short: 'Sun' },
  { key: 'mon', label: 'Monday', short: 'Mon' },
  { key: 'tue', label: 'Tuesday', short: 'Tue' },
  { key: 'wed', label: 'Wednesday', short: 'Wed' },
  { key: 'thu', label: 'Thursday', short: 'Thu' },
  { key: 'fri', label: 'Friday', short: 'Fri' },
  { key: 'sat', label: 'Saturday', short: 'Sat' },
];

const DAY_INDEX: Record<DayOfWeek, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

export function NewMeetingModal({ onClose, member, defaultDate }: NewMeetingModalProps) {
  const [mode, setMode] = useState<'single' | 'schedule'>(defaultDate ? 'single' : 'schedule');

  // Single meeting state
  const [title, setTitle] = useState('Team Meeting');
  const [date, setDate] = useState(() => {
    if (defaultDate) {
      return defaultDate.toISOString().split('T')[0];
    }
    return '';
  });
  const [startTime, setStartTime] = useState(() => {
    if (defaultDate) {
      const hours = defaultDate.getHours().toString().padStart(2, '0');
      const minutes = defaultDate.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    return '16:00';
  });
  const [endTime, setEndTime] = useState(() => {
    if (defaultDate) {
      const endDate = new Date(defaultDate);
      endDate.setHours(endDate.getHours() + 4);
      const hours = endDate.getHours().toString().padStart(2, '0');
      const minutes = endDate.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    return '20:00';
  });
  const [location, setLocation] = useState('BOHS');
  const [description, setDescription] = useState('');

  // Schedule state
  const [scheduleTitle, setScheduleTitle] = useState('Team Meeting');
  const [scheduleLocation, setScheduleLocation] = useState('BOHS');
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [weeks, setWeeks] = useState(12);
  const [startWeekDate, setStartWeekDate] = useState(() => {
    // Default to next Monday
    const d = new Date();
    const daysUntilMonday = (8 - d.getDay()) % 7 || 7;
    d.setDate(d.getDate() + daysUntilMonday);
    return d.toISOString().split('T')[0];
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const createMeeting = useMutation(api.meetings.createMeeting);
  const createScheduledMeetings = useMutation(api.meetings.createScheduledMeetings);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const addSlot = (day: DayOfWeek) => {
    setSlots([...slots, {
      id: crypto.randomUUID(),
      day,
      startTime: '16:00',
      endTime: '20:00',
    }]);
  };

  const removeSlot = (id: string) => {
    setSlots(slots.filter(s => s.id !== id));
  };

  const updateSlot = (id: string, field: 'startTime' | 'endTime', value: string) => {
    setSlots(slots.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const totalMeetings = slots.length * weeks;

  const handleSubmitSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !startTime || !endTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      await createMeeting({
        title,
        date: new Date(date + 'T00:00:00').getTime(),
        startTime,
        endTime,
        location,
        description,
      });
      toast.success('Meeting scheduled');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to schedule meeting');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (slots.length === 0) {
      toast.error('Add at least one time slot');
      return;
    }

    try {
      setIsSubmitting(true);
      const count = await createScheduledMeetings({
        title: scheduleTitle,
        location: scheduleLocation,
        startWeekDate: new Date(startWeekDate + 'T00:00:00').getTime(),
        weeks,
        slots: slots.map(s => ({
          dayIndex: DAY_INDEX[s.day],
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      });
      toast.success(`${count} meetings scheduled`);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to schedule meetings');
    } finally {
      setIsSubmitting(false);
    }
  };

  const slotsByDay = DAYS.map(day => ({
    ...day,
    slots: slots.filter(s => s.day === day.key),
  }));

  return ReactDOM.createPortal(
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />

      <div className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-50 p-0 md:p-4">
        <div className="bg-bg-secondary border-t md:border border-border rounded-t-2xl md:rounded-xl w-full md:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border-subtle shrink-0">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                {mode === 'single' ? 'Schedule Meeting' : 'Weekly Schedule'}
              </h2>
              {mode === 'schedule' && slots.length > 0 && (
                <p className="text-sm text-text-muted">
                  {totalMeetings} meetings over {weeks} weeks
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Mode Toggle */}
          {!defaultDate && (
            <div className="flex p-2 mx-4 mt-4 bg-bg-tertiary rounded-lg">
              <button
                type="button"
                onClick={() => setMode('single')}
                className={cn(
                  'flex-1 py-2 text-sm font-medium rounded-md transition-colors',
                  mode === 'single' ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-muted'
                )}
              >
                Single Meeting
              </button>
              <button
                type="button"
                onClick={() => setMode('schedule')}
                className={cn(
                  'flex-1 py-2 text-sm font-medium rounded-md transition-colors',
                  mode === 'schedule' ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-muted'
                )}
              >
                Weekly Schedule
              </button>
            </div>
          )}

          {/* Single Meeting Form */}
          {mode === 'single' && (
            <form onSubmit={handleSubmitSingle} className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">
                <Input
                  label="Title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Team Meeting"
                  required
                  autoFocus
                />

                <Input
                  label="Date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Start"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                  <Input
                    label="End"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </div>

                <Input
                  label="Location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., BOHS"
                />

                <Textarea
                  label="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional notes..."
                  rows={2}
                />
              </div>

              <div className="p-4 border-t border-border-subtle" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
                <Button type="submit" variant="primary" fullWidth loading={isSubmitting} icon={<Plus size={16} />}>
                  Schedule Meeting
                </Button>
              </div>
            </form>
          )}

          {/* Weekly Schedule Form */}
          {mode === 'schedule' && (
            <form onSubmit={handleSubmitSchedule} className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">
                <Input
                  label="Meeting Title"
                  type="text"
                  value={scheduleTitle}
                  onChange={(e) => setScheduleTitle(e.target.value)}
                  placeholder="e.g., Team Meeting"
                  required
                />

                <Input
                  label="Location"
                  type="text"
                  value={scheduleLocation}
                  onChange={(e) => setScheduleLocation(e.target.value)}
                  placeholder="e.g., BOHS"
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Starting week of"
                    type="date"
                    value={startWeekDate}
                    onChange={(e) => setStartWeekDate(e.target.value)}
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                      Repeat for
                    </label>
                    <select
                      value={weeks}
                      onChange={(e) => setWeeks(Number(e.target.value))}
                      className="w-full h-10 px-3 bg-bg-tertiary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                    >
                      {[4, 6, 8, 10, 12, 16, 20, 24].map(w => (
                        <option key={w} value={w}>{w} weeks</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Weekly Schedule Builder */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Weekly Schedule
                  </label>
                  <div className="space-y-2">
                    {slotsByDay.map(day => (
                      <div key={day.key} className="bg-bg-tertiary rounded-lg border border-border-subtle">
                        <div className="flex items-center justify-between px-3 py-2">
                          <span className="text-sm font-medium text-text-primary">{day.label}</span>
                          <button
                            type="button"
                            onClick={() => addSlot(day.key)}
                            className="text-xs text-accent hover:text-accent/80 font-medium"
                          >
                            + Add
                          </button>
                        </div>
                        {day.slots.length > 0 && (
                          <div className="px-3 pb-2 space-y-2">
                            {day.slots.map(slot => (
                              <div key={slot.id} className="flex items-center gap-2">
                                <input
                                  type="time"
                                  value={slot.startTime}
                                  onChange={(e) => updateSlot(slot.id, 'startTime', e.target.value)}
                                  className="flex-1 h-8 px-2 bg-bg-secondary border border-border rounded text-sm text-text-primary"
                                />
                                <span className="text-text-muted text-sm">to</span>
                                <input
                                  type="time"
                                  value={slot.endTime}
                                  onChange={(e) => updateSlot(slot.id, 'endTime', e.target.value)}
                                  className="flex-1 h-8 px-2 bg-bg-secondary border border-border rounded text-sm text-text-primary"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeSlot(slot.id)}
                                  className="p-1.5 text-text-muted hover:text-accent-error transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {slots.length > 0 && (
                  <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar size={16} className="text-accent" />
                      <span className="text-text-primary font-medium">
                        {totalMeetings} meetings
                      </span>
                      <span className="text-text-muted">
                        ({slots.length} per week × {weeks} weeks)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-border-subtle" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  loading={isSubmitting}
                  disabled={slots.length === 0}
                  icon={<Calendar size={16} />}
                >
                  {slots.length === 0 ? 'Add time slots above' : `Schedule ${totalMeetings} Meetings`}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
