import React from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { MemberWithProfile } from '../../lib/members';
import { toast } from 'sonner';
import { Clock, MapPin, Trash2, Users, CheckCircle, XCircle, X } from 'lucide-react';
import { Button } from '../ui';

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
    <div className="border-t border-border-subtle">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-semibold text-text-primary">
            {date.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
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
                  toast.success('Meeting deleted');
                }
              }}
            />
          ))}
        </div>
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
  const canManage = currentMember.role === 'admin' || currentMember.role === 'lead';

  const attending = rsvps?.filter((r: any) => r.status === 'attending') || [];
  const notAttending = rsvps?.filter((r: any) => r.status === 'not_attending') || [];

  return (
    <div className="bg-bg-tertiary rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-text-primary">{meeting.title}</h4>
          <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted mt-1">
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
        {canManage && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="shrink-0 text-text-muted hover:text-accent-error"
            icon={<Trash2 size={14} />}
          >
            <span className="sr-only">Delete</span>
          </Button>
        )}
      </div>

      {rsvps && (rsvps.length > 0) && (
        <div className="pt-3 border-t border-border-subtle">
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-text-muted" />
            <span className="text-sm font-medium text-text-secondary">RSVPs</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="flex items-center gap-1 text-accent-success mb-2">
                <CheckCircle size={12} />
                <span className="font-medium">Attending ({attending.length})</span>
              </div>
              <div className="space-y-1">
                {attending.map((rsvp: any) => {
                  const member = members.find((m: any) => m._id === rsvp.memberId);
                  return member ? (
                    <div key={rsvp._id} className="text-text-muted text-sm">
                      {member.name}
                    </div>
                  ) : null;
                })}
                {attending.length === 0 && (
                  <div className="text-text-dim text-sm">No responses yet</div>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1 text-accent-error mb-2">
                <XCircle size={12} />
                <span className="font-medium">Not Attending ({notAttending.length})</span>
              </div>
              <div className="space-y-1">
                {notAttending.map((rsvp: any) => {
                  const member = members.find((m: any) => m._id === rsvp.memberId);
                  return member ? (
                    <div key={rsvp._id} className="text-text-muted text-sm">
                      {member.name}
                    </div>
                  ) : null;
                })}
                {notAttending.length === 0 && (
                  <div className="text-text-dim text-sm">-</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
