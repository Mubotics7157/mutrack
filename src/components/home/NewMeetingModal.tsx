import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { MemberWithProfile } from '../../lib/members';
import { toast } from 'sonner';
import { Plus, MapPin, X } from 'lucide-react';
import { Button, Input, Textarea } from '../ui';

interface NewMeetingModalProps {
  onClose: () => void;
  member: MemberWithProfile;
  defaultDate?: Date | null;
}

export function NewMeetingModal({ onClose, member, defaultDate }: NewMeetingModalProps) {
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
      endDate.setHours(endDate.getHours() + 2);
      const hours = endDate.getHours().toString().padStart(2, '0');
      const minutes = endDate.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    return '18:00';
  });
  const [location, setLocation] = useState('BOHS');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createMeeting = useMutation(api.meetings.createMeeting);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !date || !startTime || !endTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    const meetingDate = new Date(date + 'T00:00:00');

    try {
      setIsSubmitting(true);
      await createMeeting({
        title,
        date: meetingDate.getTime(),
        startTime,
        endTime,
        location,
        description,
      });

      toast.success('Meeting scheduled');
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to schedule meeting';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return ReactDOM.createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal - Bottom sheet on mobile, centered on desktop */}
      <div className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-50 p-0 md:p-4">
        <div className="bg-bg-secondary border-t md:border border-border rounded-t-2xl md:rounded-xl w-full md:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border-subtle shrink-0">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                Schedule Meeting
              </h2>
              {defaultDate && (
                <p className="text-sm text-text-muted">
                  {defaultDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
              <Input
                label="Meeting Title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Weekly Team Meeting"
                required
                autoFocus
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
                <Input
                  label="Start Time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>

              <Input
                label="End Time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />

              <div className="relative">
                <Input
                  label="Location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., BOHS"
                  className="pl-10"
                />
                <MapPin
                  size={16}
                  className="absolute left-3 top-[38px] text-text-dim pointer-events-none"
                />
              </div>

              <Textarea
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Meeting agenda and notes..."
                rows={3}
              />
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border-subtle bg-bg-secondary shrink-0" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
              <div className="flex gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  loading={isSubmitting}
                  icon={<Plus size={16} />}
                >
                  Schedule Meeting
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                  className="shrink-0"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body
  );
}
