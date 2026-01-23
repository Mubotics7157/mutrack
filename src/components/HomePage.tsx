import React, { useEffect, useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { MemberWithProfile } from '../lib/members';
import { toast } from 'sonner';
import { Calendar, Check, Bell, Trophy, Clock, MapPin, Plus, ChevronRight } from 'lucide-react';
import { Button, Badge } from './ui';
import { cn } from '../lib/utils';
import {
  CalendarView,
  MeetingCard,
  SelectedDatePanel,
  NewMeetingModal,
} from './home';
import { ActiveAttendanceStatus } from './ActiveAttendanceStatus';
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
  const leaderboard = useQuery(api.members.getLeaderboard, { range: 'allTime' }) as LeaderboardEntry[] | undefined;
  const rsvpToMeeting = useMutation(api.meetings.rsvpToMeeting);
  const savePush = useMutation(api.members.savePushSubscription);
  const setNotificationsEnabled = useMutation(api.members.setNotificationsEnabled);

  const myStats = useMemo(() => {
    if (!leaderboard) return null;
    const myEntry = leaderboard.find((e) => e.memberId === member._id);
    if (!myEntry) return { rank: null, points: 0, hours: 0 };

    const sortedByPoints = [...leaderboard].sort((a, b) => b.totalPoints - a.totalPoints);
    const pointsRank = sortedByPoints.findIndex((e) => e.memberId === member._id) + 1;

    return {
      pointsRank,
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
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    return 'Soon';
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

  const allMembers = (useQuery(api.members.getAllMembers) as MemberWithProfile[] | undefined) || [];

  return (
    <div className="space-y-5 pt-2">
      {showNewMeeting && canManageMeetings && (
        <NewMeetingModal
          onClose={() => { setShowNewMeeting(false); setQuickMeetingDate(null); }}
          member={member}
          defaultDate={quickMeetingDate}
        />
      )}

      <ActiveAttendanceStatus />

      {/* Header: Greeting + Stats + Actions */}
      <header className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">
              {member.name?.split(' ')[0] || 'Welcome'}
            </h1>
            <p className="text-sm text-text-muted">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>

          {/* Compact Stats */}
          {myStats && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm">
                <Trophy size={14} className="text-accent-orange" />
                <span className="font-medium text-text-primary">{formatPointsDisplay(myStats.points)}</span>
                {myStats.pointsRank && myStats.pointsRank <= 3 && (
                  <Badge variant="warning" size="sm">#{myStats.pointsRank}</Badge>
                )}
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1.5 text-sm">
                <Clock size={14} className="text-accent-success" />
                <span className="font-medium text-text-primary">{formatHours(myStats.hours)}h</span>
              </div>
            </div>
          )}
        </div>

        {/* Notification prompt - subtle inline */}
        {devicePushEnabled === false && (
          <button
            onClick={enableDeviceNotifications}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <Bell size={14} />
            <span>Enable notifications for reminders</span>
            <ChevronRight size={14} />
          </button>
        )}
      </header>

      {/* Next Meeting Hero */}
      {nextMeeting ? (
        <section className="bg-gradient-to-br from-accent/10 via-bg-secondary to-bg-secondary border border-accent/20 rounded-2xl overflow-hidden">
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-medium text-accent uppercase tracking-wide">Next up</span>
              <span className="text-xs text-accent-success font-medium bg-accent-success/10 px-2 py-0.5 rounded-full">
                {getTimeUntilMeeting(new Date(getMeetingStartMs(nextMeeting)))}
              </span>
            </div>

            <h2 className="text-xl font-semibold text-text-primary mb-2">
              {nextMeeting.title}
            </h2>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary mb-5">
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-text-muted" />
                {new Date(nextMeeting.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {nextMeeting.startTime}
              </span>
              {nextMeeting.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-text-muted" />
                  {nextMeeting.location}
                </span>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant={currentRsvpStatus === 'attending' ? 'success' : 'primary'}
                size="md"
                onClick={() => handleRsvp('attending')}
                disabled={rsvpSubmitting}
                icon={currentRsvpStatus === 'attending' ? <Check size={16} /> : undefined}
                className="flex-1"
              >
                {currentRsvpStatus === 'attending' ? 'Attending' : "I'm in"}
              </Button>
              <Button
                variant={currentRsvpStatus === 'not_attending' ? 'danger' : 'secondary'}
                size="md"
                onClick={() => handleRsvp('not_attending')}
                disabled={rsvpSubmitting}
                className={cn(
                  'flex-1',
                  currentRsvpStatus !== 'not_attending' && 'bg-bg-tertiary hover:bg-bg-hover'
                )}
              >
                {currentRsvpStatus === 'not_attending' ? "Can't go" : 'Skip'}
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <section className="bg-bg-secondary border border-border rounded-2xl p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto mb-3">
            <Calendar size={24} className="text-text-muted" />
          </div>
          <h3 className="text-base font-medium text-text-primary mb-1">No upcoming meetings</h3>
          <p className="text-sm text-text-muted mb-4">
            {canManageMeetings ? 'Schedule one to get started' : 'Check back later'}
          </p>
          {canManageMeetings && (
            <Button variant="primary" size="sm" onClick={() => setShowNewMeeting(true)} icon={<Plus size={16} />}>
              New Meeting
            </Button>
          )}
        </section>
      )}

      {/* Two Column Layout: Calendar + Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Calendar */}
        <section className="lg:col-span-3 bg-bg-secondary border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-accent" />
              <h2 className="text-sm font-medium text-text-primary">Calendar</h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewMode('week')}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                  viewMode === 'week' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary'
                )}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                  viewMode === 'month' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary'
                )}
              >
                Month
              </button>
            </div>
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

        {/* Upcoming Meetings Sidebar */}
        <section className="lg:col-span-2 bg-bg-secondary border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
            <h2 className="text-sm font-medium text-text-primary">Upcoming</h2>
            {canManageMeetings && (
              <button
                onClick={() => setShowNewMeeting(true)}
                className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-accent/10 transition-colors"
              >
                <Plus size={16} />
              </button>
            )}
          </div>

          {upcomingMeetings.length > 0 ? (
            <div className="divide-y divide-border-subtle max-h-80 overflow-y-auto">
              {upcomingMeetings.map((meeting: any, index: number) => (
                <MeetingCard
                  key={meeting._id}
                  meeting={meeting}
                  member={member}
                />
              ))}
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-sm text-text-muted">No meetings scheduled</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
