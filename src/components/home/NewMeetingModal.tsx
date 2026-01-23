import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { MemberWithProfile } from '../../lib/members';
import { toast } from 'sonner';
import { Plus, MapPin, X } from 'lucide-react';

interface NewMeetingModalProps {
  onClose: () => void;
  member: MemberWithProfile;
  defaultDate?: Date | null;
}

export function NewMeetingModal({ onClose, member, defaultDate }: NewMeetingModalProps) {
  const [title, setTitle] = useState('team meeting');
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
  const [location, setLocation] = useState('bohs');
  const [description, setDescription] = useState('');

  const createMeeting = useMutation(api.meetings.createMeeting);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !date || !startTime || !endTime) {
      toast.error('please fill in all required fields');
      return;
    }

    const meetingDate = new Date(date + 'T00:00:00');

    try {
      await createMeeting({
        title,
        date: meetingDate.getTime(),
        startTime,
        endTime,
        location,
        description,
      });

      toast.success('meeting scheduled successfully');
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'failed to schedule meeting';
      toast.error(message);
    }
  };

  return ReactDOM.createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      />

      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-full max-w-lg p-4">
        <div className="glass-panel p-8 max-h-[85vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-light">
              {defaultDate
                ? `schedule meeting for ${defaultDate.toLocaleDateString()}`
                : 'schedule new meeting'}
            </h2>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary touch-feedback"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-2 text-sm text-text-muted">meeting title *</label>
              <input
                type="text"
                className="input-modern"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., weekly team meeting"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm text-text-muted">date *</label>
                <input
                  type="date"
                  className="input-modern"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block mb-2 text-sm text-text-muted">start time *</label>
                <input
                  type="time"
                  className="input-modern"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm text-text-muted">end time *</label>
              <input
                type="time"
                className="input-modern"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>

            <div>
              <label className="block mb-2 text-sm text-text-muted">location</label>
              <div className="relative">
                <MapPin
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim"
                />
                <input
                  type="text"
                  className="input-modern pl-10"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., bohs"
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm text-text-muted">description</label>
              <textarea
                className="input-modern resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="meeting agenda and notes..."
                rows={3}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="btn-modern btn-primary flex-1 flex items-center justify-center gap-2 touch-feedback"
              >
                <Plus size={16} />
                <span>schedule meeting</span>
              </button>
              <button
                type="button"
                className="btn-modern flex-1 touch-feedback"
                onClick={onClose}
              >
                cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body
  );
}
