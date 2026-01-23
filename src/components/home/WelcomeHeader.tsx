import React from 'react';
import { Clock, MapPin, Check } from 'lucide-react';
import { MemberWithProfile } from '../../lib/members';
import { Button } from '../ui';
import { cn } from '../../lib/utils';

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
  const firstName = member.name?.split(' ')[0] || 'there';

  return (
    <section className="space-y-4">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">
          Welcome back, {firstName}
        </h1>
        <p className="text-sm text-text-muted mt-1">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Next Meeting Card */}
      {nextMeeting ? (
        <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border-subtle">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-accent uppercase tracking-wide">
                Next Meeting
              </span>
              <span className="text-xs text-accent-success font-medium">
                {getTimeUntilMeeting(new Date(getMeetingStartMs(nextMeeting)))}
              </span>
            </div>
          </div>

          <div className="p-4">
            <h2 className="text-lg font-semibold text-text-primary mb-3">
              {nextMeeting.title}
            </h2>

            <div className="flex flex-wrap gap-4 text-sm text-text-secondary mb-4">
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-text-muted" />
                {new Date(nextMeeting.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                at {nextMeeting.startTime}
              </span>
              {nextMeeting.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-text-muted" />
                  {nextMeeting.location}
                </span>
              )}
            </div>

            {/* RSVP Buttons */}
            <div className="flex gap-2">
              <Button
                variant={currentRsvpStatus === 'attending' ? 'success' : 'secondary'}
                size="sm"
                onClick={onRsvpAttending}
                disabled={rsvpSubmitting}
                icon={currentRsvpStatus === 'attending' ? <Check size={14} /> : undefined}
                className="flex-1"
              >
                {currentRsvpStatus === 'attending' ? 'Attending' : 'RSVP Yes'}
              </Button>
              <Button
                variant={currentRsvpStatus === 'not_attending' ? 'danger' : 'ghost'}
                size="sm"
                onClick={onRsvpNotAttending}
                disabled={rsvpSubmitting}
                icon={currentRsvpStatus === 'not_attending' ? <Check size={14} /> : undefined}
                className="flex-1"
              >
                {currentRsvpStatus === 'not_attending' ? "Can't Attend" : "Can't Make It"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-bg-secondary border border-border rounded-xl p-4">
          <p className="text-text-secondary text-center">
            No upcoming meetings scheduled
          </p>
          {canManageMeetings && (
            <p className="text-sm text-text-muted text-center mt-1">
              Use quick actions below to schedule one
            </p>
          )}
        </div>
      )}
    </section>
  );
}
