import React, { useEffect, useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { MemberWithProfile } from '../lib/members';
import { toast } from 'sonner';
import { Calendar, Check, BellOff, Trophy, Clock, TrendingUp, ChevronRight, Users } from 'lucide-react';
import { Button, Badge } from './ui';
import { cn } from '../lib/utils';
import {
  WelcomeHeader,
  QuickActions,
  CalendarView,
  MeetingCard,
  SelectedDatePanel,
  NewMeetingModal,
} from './home';
import { formatHours } from './members/helpers';
import { LeaderboardEntry } from './members/types';

interface HomePageProps {
  member: MemberWithProfile;
}

export function HomePage({ member }: HomePageProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('week');
  const [showSelectedDate, setShowSelectedDate] = useState(false);
  const [devicePushEnabled, setDevicePushEnabled] = useState<boolean>();
  const [quickMeetingDate, setQuickMeetingDate] = useState<Date | null>(null);
  const [rsvpSubmitting, setRsvpSubmitting] = useState(false);

  const canManageMeetings = member.role === 'admin' || member.role === 'lead';
  const meetings = useQuery(api.meetings.getMeetings);
  const allMembers = (useQuery(api.members.getAllMembers) as MemberWithProfile[] | undefined) || [];
  const leaderboard = useQuery(api.members.getLeaderboard, { range: 'allTime' }) as LeaderboardEntry[] | undefined;
  const rsvpToMeeting = useMutation(api.meetings.rsvpToMeeting);
  const savePush = useMutation(api.members.savePushSubscription);
  const setNotificationsEnabled = useMutation(api.members.setNotificationsEnabled);

  // Get user's stats
  const myStats = useMemo(() => {
    if (!leaderboard) return null;
    const myEntry = leaderboard.find((e) => e.memberId === member._id);
    if (!myEntry) return { rank: null, points: 0, hours: 0 };

    const sortedByPoints = [...leaderboard].sort((a, b) => b.totalPoints - a.totalPoints);
    const pointsRank = sortedByPoints.findIndex((e) => e.memberId === member._id) + 1;

    const sortedByHours = [...leaderboard].sort((a, b) => b.totalAttendanceMs - a.totalAttendanceMs);
    const hoursRank = sortedByHours.findIndex((e) => e.memberId === member._id) + 1;

    return {
      pointsRank,
      hoursRank,
      points: myEntry.totalPoints,
      hours: myEntry.totalAttendanceMs,
      totalMembers: leaderboard.length,
    };
  }, [leaderboard, member._id]);

  const getMeetingStartMs = (m: any): number => {
    const start = new Date(m.date);
    const [hours, minutes] = (m.startTime ?? '00:00').split(':').map((x: string) => parseInt(x, 10) || 0);
    start.setHours(hours, minutes, 0, 0);
    return start.getTime();
  };

  const upcomingMeetings = (meetings || [])
    .filter((m: any) => getMeetingStartMs(m) >= Date.now())
    .sort((a: any, b: any) => getMeetingStartMs(a) - getMeetingStartMs(b))
    .slice(0, 5);

  const nextMeeting = upcomingMeetings?.[0];
  const myRsvp = useQuery(api.meetings.getMyRsvpForMeeting, nextMeeting ? { meetingId: nextMeeting._id } : 'skip');
  const currentRsvpStatus: 'attending' | 'not_attending' | undefined = myRsvp?.status;

  const getTimeUntilMeeting = (meetingDate: Date) => {
    const now = new Date();
    const diff = meetingDate.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `in ${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `in ${hours} hour${hours > 1 ? 's' : ''}`;
    return 'soon';
  };

  const handleQuickMeeting = (date: Date) => {
    if (!canManageMeetings) return;
    setQuickMeetingDate(date);
    setShowNewMeeting(true);
  };

  const handleRsvp = async (status: 'attending' | 'not_attending') => {
    if (!nextMeeting) return;
    if (currentRsvpStatus === status) return;
    try {
      setRsvpSubmitting(true);
      await rsvpToMeeting({ meetingId: nextMeeting._id, status });
    } catch {
      toast.error('Failed to save RSVP');
    } finally {
      setRsvpSubmitting(false);
    }
  };

  // Check device push notification support
  useEffect(() => {
    const checkDeviceSubscription = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setDevicePushEnabled(false);
        return;
      }
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) { setDevicePushEnabled(false); return; }
        const sub = await reg.pushManager.getSubscription();
        setDevicePushEnabled(Notification.permission === 'granted' && !!sub);
      } catch { setDevicePushEnabled(false); }
    };
    void checkDeviceSubscription();
  }, []);

  const enableDeviceNotifications = async () => {
    try {
      if (!('serviceWorker' in navigator)) { toast.error('Service worker not supported'); return; }
      const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register('/sw.js'));
      if (!reg) { toast.error('Failed to register service worker'); return; }
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') { toast.error('Notifications blocked'); return; }
      }
      const vapid = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY;
      if (!vapid) { toast.error('Push not configured'); return; }
      const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = atob(base64);
        return Uint8Array.from(rawData, (c) => c.charCodeAt(0));
      };
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapid) });
      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      await savePush({ endpoint: json.endpoint ?? '', keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' } });
      await setNotificationsEnabled({ enabled: true });
      setDevicePushEnabled(true);
      toast.success('Notifications enabled');
    } catch { toast.error('Failed to enable notifications'); }
  };

  const formatPointsDisplay = (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value.toString();
  };

  return (
    <div className="space-y-6 pt-2">
      {/* New Meeting Modal */}
      {showNewMeeting && canManageMeetings && (
        <NewMeetingModal
          onClose={() => { setShowNewMeeting(false); setQuickMeetingDate(null); }}
          member={member}
          defaultDate={quickMeetingDate}
        />
      )}

      {/* Welcome Header with Personal Stats */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">
              Welcome back, {member.name?.split(' ')[0] || 'there'}
            </h1>
            <p className="text-sm text-text-muted mt-1">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          {/* Quick Actions for Admin/Lead */}
          {canManageMeetings && (
            <QuickActions onNewMeeting={() => setShowNewMeeting(true)} onQuickMeeting={handleQuickMeeting} />
          )}
        </div>

        {/* Personal Stats Cards */}
        {myStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-bg-secondary border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-accent-orange/10 rounded-lg">
                  <Trophy size={14} className="text-accent-orange" />
                </div>
                <span className="text-xs text-text-muted">Points</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-semibold text-text-primary">
                  {formatPointsDisplay(myStats.points)}
                </span>
                {myStats.pointsRank && myStats.pointsRank <= 10 && (
                  <Badge variant="warning" size="sm">#{myStats.pointsRank}</Badge>
                )}
              </div>
            </div>

            <div className="bg-bg-secondary border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-accent-success/10 rounded-lg">
                  <Clock size={14} className="text-accent-success" />
                </div>
                <span className="text-xs text-text-muted">Hours</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-semibold text-text-primary">
                  {formatHours(myStats.hours)}h
                </span>
                {myStats.hoursRank && myStats.hoursRank <= 10 && (
                  <Badge variant="success" size="sm">#{myStats.hoursRank}</Badge>
                )}
              </div>
            </div>

            <div className="bg-bg-secondary border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-accent/10 rounded-lg">
                  <Calendar size={14} className="text-accent" />
                </div>
                <span className="text-xs text-text-muted">Upcoming</span>
              </div>
              <span className="text-xl font-semibold text-text-primary">
                {upcomingMeetings.length}
              </span>
            </div>

            <div className="bg-bg-secondary border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-accent/10 rounded-lg">
                  <Users size={14} className="text-accent" />
                </div>
                <span className="text-xs text-text-muted">Team Size</span>
              </div>
              <span className="text-xl font-semibold text-text-primary">
                {allMembers.length}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Notification Banner */}
      {devicePushEnabled === false && (
        <div className="bg-bg-secondary border border-border rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-dim rounded-lg">
              <BellOff size={18} className="text-accent" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">Enable notifications</p>
              <p className="text-xs text-text-muted">Get meeting reminders</p>
            </div>
          </div>
          <Button size="sm" variant="primary" onClick={enableDeviceNotifications}>
            Enable
          </Button>
        </div>
      )}

      {/* Next Meeting Card */}
      {nextMeeting && (
        <section className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
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
                  <TrendingUp size={14} className="text-text-muted" />
                  {nextMeeting.location}
                </span>
              )}
            </div>

            {/* RSVP Buttons */}
            <div className="flex gap-2">
              <Button
                variant={currentRsvpStatus === 'attending' ? 'success' : 'secondary'}
                size="sm"
                onClick={() => handleRsvp('attending')}
                disabled={rsvpSubmitting}
                icon={currentRsvpStatus === 'attending' ? <Check size={14} /> : undefined}
                className="flex-1"
              >
                {currentRsvpStatus === 'attending' ? 'Attending' : 'RSVP Yes'}
              </Button>
              <Button
                variant={currentRsvpStatus === 'not_attending' ? 'danger' : 'ghost'}
                size="sm"
                onClick={() => handleRsvp('not_attending')}
                disabled={rsvpSubmitting}
                icon={currentRsvpStatus === 'not_attending' ? <Check size={14} /> : undefined}
                className="flex-1"
              >
                {currentRsvpStatus === 'not_attending' ? "Can't Attend" : "Can't Make It"}
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Calendar Section */}
      <section className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-accent" />
            <h2 className="text-base font-semibold text-text-primary">Calendar</h2>
          </div>
          <button
            onClick={() => setViewMode(viewMode === 'month' ? 'week' : 'month')}
            className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary bg-bg-tertiary rounded-lg transition-colors"
          >
            {viewMode === 'month' ? 'Week' : 'Month'}
          </button>
        </div>

        <div className="p-4">
          <CalendarView
            meetings={meetings || []}
            selectedDate={selectedDate}
            onDateSelect={(date) => { setSelectedDate(date); setShowSelectedDate(true); }}
            onDateDoubleClick={canManageMeetings ? handleQuickMeeting : undefined}
            viewMode={viewMode}
          />
        </div>

        {showSelectedDate && (
          <SelectedDatePanel
            date={selectedDate}
            meetings={meetings || []}
            members={allMembers}
            currentMember={member}
            onClose={() => setShowSelectedDate(false)}
          />
        )}
      </section>

      {/* More Upcoming Meetings */}
      {upcomingMeetings && upcomingMeetings.length > 1 && (
        <section className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border-subtle">
            <h2 className="text-base font-semibold text-text-primary">More Upcoming</h2>
            <span className="text-sm text-text-muted">{upcomingMeetings.length - 1} more</span>
          </div>
          <div className="divide-y divide-border-subtle">
            {upcomingMeetings.slice(1).map((meeting: any) => (
              <MeetingCard key={meeting._id} meeting={meeting} member={member} />
            ))}
          </div>
        </section>
      )}

      {/* No Meetings State */}
      {!nextMeeting && (
        <section className="bg-bg-secondary border border-border rounded-xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto mb-4">
            <Calendar size={32} className="text-text-muted" />
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">
            No upcoming meetings
          </h3>
          <p className="text-sm text-text-muted mb-4">
            {canManageMeetings
              ? 'Create a meeting to get started'
              : 'Check back later for scheduled meetings'}
          </p>
          {canManageMeetings && (
            <Button variant="primary" onClick={() => setShowNewMeeting(true)}>
              Schedule Meeting
            </Button>
          )}
        </section>
      )}
    </div>
  );
}
