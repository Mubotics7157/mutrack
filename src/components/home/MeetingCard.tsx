import React from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { MemberWithProfile } from '../../lib/members';
import { toast } from 'sonner';
import { Clock, MapPin, Trash2 } from 'lucide-react';
import { Button } from '../ui';

interface MeetingCardProps {
  meeting: any;
  member: MemberWithProfile;
}

export function MeetingCard({ meeting, member }: MeetingCardProps) {
  const deleteMeeting = useMutation(api.meetings.deleteMeeting);
  const canManage = member.role === 'admin' || member.role === 'lead';

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${meeting.title}"?`)) {
      await deleteMeeting({ meetingId: meeting._id });
      toast.success('Meeting deleted');
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-bg-hover transition-colors">
      {/* Time indicator */}
      <div className="shrink-0 w-12 text-center">
        <div className="text-sm font-medium text-text-primary">{meeting.startTime}</div>
        <div className="text-xs text-text-muted">
          {new Date(meeting.date).toLocaleDateString('en-US', { weekday: 'short' })}
        </div>
      </div>

      {/* Divider */}
      <div className="w-0.5 h-10 bg-accent rounded-full shrink-0" />

      {/* Meeting details */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-text-primary truncate">
          {meeting.title}
        </h3>
        <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {new Date(meeting.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </span>
          {meeting.location && (
            <span className="flex items-center gap-1 truncate">
              <MapPin size={12} />
              {meeting.location}
            </span>
          )}
        </div>
      </div>

      {/* Delete button (admin/lead only) */}
      {canManage && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          className="shrink-0 text-text-muted hover:text-accent-error"
          icon={<Trash2 size={16} />}
        >
          <span className="sr-only">Delete</span>
        </Button>
      )}
    </div>
  );
}
