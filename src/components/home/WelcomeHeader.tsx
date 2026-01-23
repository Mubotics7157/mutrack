import React from 'react';
import { Clock, MapPin } from 'lucide-react';
import { MemberWithProfile } from '../../lib/members';

interface WelcomeHeaderProps {
  member: MemberWithProfile;
  nextMeeting: any | null;
  currentRsvpStatus: 'attending' | 'not_attending' | undefined;
  rsvpSubmitting: boolean;
  onRsvpAttending: () => void;
  onRsvpNotAttending: () => void;
  getTimeUntilMeeting: (date: Date) => string;
  getMeetingStartMs: (meeting: any) => number;
}

export function WelcomeHeader({
  member,
  nextMeeting,
  currentRsvpStatus,
  rsvpSubmitting,
  onRsvpAttending,
  onRsvpNotAttending,
  getTimeUntilMeeting,
  getMeetingStartMs,
}: WelcomeHeaderProps) {
  const canManageMeetings = member.role === 'admin' || member.role === 'lead';

  return (
    <div className="glass-panel p-6">
      <h1 className="text-2xl font-light mb-4">welcome, {member.name}</h1>
      {nextMeeting ? (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-lg font-light mb-1">
              next meeting:{' '}
              <span className="text-sunset-orange">{nextMeeting.title}</span>
            </h2>
            <p className="text-text-muted flex items-center gap-2">
              <Clock size={14} />
              {new Date(nextMeeting.date)
                .toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })
                .toLowerCase()}{' '}
              at {nextMeeting.startTime}
              <span className="text-accent-green ml-2">
                {getTimeUntilMeeting(new Date(getMeetingStartMs(nextMeeting)))}
              </span>
            </p>
            {nextMeeting.location && (
              <p className="text-text-muted flex items-center gap-2 mt-1">
                <MapPin size={14} />
                {nextMeeting.location}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              className="btn-modern btn-primary touch-feedback"
              onClick={onRsvpAttending}
              disabled={rsvpSubmitting || currentRsvpStatus === 'attending'}
              aria-pressed={currentRsvpStatus === 'attending'}
            >
              {currentRsvpStatus === 'attending' ? 'attending ✓' : 'rsvp: attending'}
            </button>
            <button
              className="btn-modern touch-feedback"
              onClick={onRsvpNotAttending}
              disabled={rsvpSubmitting || currentRsvpStatus === 'not_attending'}
              aria-pressed={currentRsvpStatus === 'not_attending'}
            >
              {currentRsvpStatus === 'not_attending' ? "can't attend ✓" : "can't attend"}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-text-muted">no upcoming meetings scheduled</p>
          {canManageMeetings && (
            <p className="text-sm text-text-dim mt-2">
              use the quick actions below to schedule a meeting
            </p>
          )}
        </div>
      )}
    </div>
  );
}
