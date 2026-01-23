import React from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { MemberWithProfile } from '../../lib/members';
import { toast } from 'sonner';
import { Clock, MapPin, Trash2, Users, CheckCircle, XCircle, X } from 'lucide-react';

interface SelectedDatePanelProps {
  date: Date;
  meetings: any[];
  members: MemberWithProfile[];
  currentMember: MemberWithProfile;
  onClose: () => void;
}

export function SelectedDatePanel({
  date,
  meetings,
  members,
  currentMember,
  onClose,
}: SelectedDatePanelProps) {
  const meetingsForDate = meetings.filter((m: any) => {
    const meetingDate = new Date(m.date);
    return meetingDate.toDateString() === date.toDateString();
  });

  const deleteMeeting = useMutation(api.meetings.deleteMeeting);

  if (meetingsForDate.length === 0) return null;

  return (
    <div className="mt-6 p-6 bg-glass border border-border-glass rounded-xl">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-light">
          meetings for{' '}
          {date
            .toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })
            .toLowerCase()}
        </h3>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text-primary touch-feedback"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-4">
        {meetingsForDate.map((meeting: any) => (
          <MeetingWithRsvps
            key={meeting._id}
            meeting={meeting}
            members={members}
            currentMember={currentMember}
            onDelete={async () => {
              if (confirm(`Delete "${meeting.title}"?`)) {
                await deleteMeeting({ meetingId: meeting._id });
                toast.success('meeting deleted');
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface MeetingWithRsvpsProps {
  meeting: any;
  members: MemberWithProfile[];
  currentMember: MemberWithProfile;
  onDelete: () => void;
}

function MeetingWithRsvps({ meeting, members, currentMember, onDelete }: MeetingWithRsvpsProps) {
  const rsvps = useQuery(api.meetings.getRsvpsForMeeting, { meetingId: meeting._id });

  const attending = rsvps?.filter((r: any) => r.status === 'attending') || [];
  const notAttending = rsvps?.filter((r: any) => r.status === 'not_attending') || [];

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium text-text-primary">{meeting.title}</h4>
          <div className="flex items-center gap-4 text-sm text-text-muted mt-1">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {meeting.startTime} - {meeting.endTime}
            </span>
            {meeting.location && (
              <span className="flex items-center gap-1">
                <MapPin size={12} />
                {meeting.location}
              </span>
            )}
          </div>
          {meeting.description && (
            <p className="text-sm text-text-muted mt-2">{meeting.description}</p>
          )}
        </div>
        {(currentMember.role === 'admin' || currentMember.role === 'lead') && (
          <button
            className="btn-modern btn-danger p-2 touch-feedback"
            onClick={onDelete}
            title="Delete meeting"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {rsvps && (
        <div className="pl-4 border-l-2 border-border-glass">
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} className="text-text-muted" />
            <span className="text-sm font-mono text-text-secondary">rsvps</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="flex items-center gap-1 text-accent-green mb-1">
                <CheckCircle size={12} />
                <span className="font-mono">attending ({attending.length})</span>
              </div>
              <div className="space-y-1">
                {attending.map((rsvp: any) => {
                  const member = members.find((m: any) => m._id === rsvp.memberId);
                  return member ? (
                    <div key={rsvp._id} className="text-text-muted">
                      {member.name}
                    </div>
                  ) : null;
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1 text-error-red mb-1">
                <XCircle size={12} />
                <span className="font-mono">not attending ({notAttending.length})</span>
              </div>
              <div className="space-y-1">
                {notAttending.map((rsvp: any) => {
                  const member = members.find((m: any) => m._id === rsvp.memberId);
                  return member ? (
                    <div key={rsvp._id} className="text-text-muted">
                      {member.name}
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
