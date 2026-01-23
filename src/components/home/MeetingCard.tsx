import React from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { MemberWithProfile } from '../../lib/members';
import { toast } from 'sonner';
import { Clock, MapPin, Trash2 } from 'lucide-react';

interface MeetingCardProps {
  meeting: any;
  member: MemberWithProfile;
}

export function MeetingCard({ meeting, member }: MeetingCardProps) {
  const deleteMeeting = useMutation(api.meetings.deleteMeeting);

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${meeting.title}"?`)) {
      await deleteMeeting({ meetingId: meeting._id });
      toast.success('meeting deleted successfully');
    }
  };

  return (
    <div className="card-modern flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h3 className="text-lg font-light mb-1">{meeting.title}</h3>
        <div className="flex items-center gap-4 text-sm text-text-muted">
          <span className="flex items-center gap-1">
            <Clock size={14} />
            {new Date(meeting.date)
              .toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })
              .toLowerCase()}{' '}
            at {meeting.startTime}
          </span>
          {meeting.location && (
            <span className="flex items-center gap-1">
              <MapPin size={14} />
              {meeting.location}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {(member.role === 'admin' || member.role === 'lead') && (
          <button
            className="btn-modern btn-danger p-2 touch-feedback"
            onClick={handleDelete}
            title="Delete meeting"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
