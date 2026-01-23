import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { MemberWithProfile } from '../lib/members';
import { toast } from 'sonner';
import { Calendar, ChevronRight, Plus, Bell, BellOff } from 'lucide-react';
import { Button } from './ui';
import { cn } from '../lib/utils';
import {
  WelcomeHeader,
  QuickActions,
  CalendarView,
  MeetingCard,
  SelectedDatePanel,
  NewMeetingModal,
} from './home';

interface HomePageProps {
  member: MemberWithProfile;
}

export function HomePage({ member }: HomePageProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('week'); // Default to week on mobile
  const [showSelectedDate, setShowSelectedDate] = useState(false);
  const [devicePushEnabled, setDevicePushEnabled] = useState<boolean>();
  const [quickMeetingDate, setQuickMeetingDate] = useState<Date | null>(null);
  const [rsvpSubmitting, setRsvpSubmitting] = useState(false);

  const canManageMeetings = member.role === 'admin' || member.role === 'lead';
  const meetings = useQuery(api.meetings.getMeetings);
  const allMembers = (useQuery(api.members.getAllMembers) as MemberWithProfile[] | undefined) || [];
  const rsvpToMeeting = useMutation(api.meetings.rsvpToMeeting);
  const savePush = useMutation(api.members.savePushSubscription);
  const setNotificationsEnabled = useMutation(api.members.setNotificationsEnabled);

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

  return (
    <div className="space-y-6 pt-2">
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

      {/* New Meeting Modal */}
      {showNewMeeting && canManageMeetings && (
        <NewMeetingModal
          onClose={() => { setShowNewMeeting(false); setQuickMeetingDate(null); }}
          member={member}
          defaultDate={quickMeetingDate}
        />
      )}

      {/* Welcome + Next Meeting */}
      <WelcomeHeader
        member={member}
        nextMeeting={nextMeeting}
        currentRsvpStatus={currentRsvpStatus}
        rsvpSubmitting={rsvpSubmitting}
        onRsvpAttending={() => handleRsvp('attending')}
        onRsvpNotAttending={() => handleRsvp('not_attending')}
        getTimeUntilMeeting={getTimeUntilMeeting}
        getMeetingStartMs={getMeetingStartMs}
      />

      {/* Quick Actions for Admin/Lead */}
      {canManageMeetings && (
        <QuickActions onNewMeeting={() => setShowNewMeeting(true)} onQuickMeeting={handleQuickMeeting} />
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

      {/* Upcoming Meetings */}
      {upcomingMeetings && upcomingMeetings.length > 1 && (
        <section className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border-subtle">
            <h2 className="text-base font-semibold text-text-primary">Upcoming</h2>
            <span className="text-sm text-text-muted">{upcomingMeetings.length} meetings</span>
          </div>
          <div className="divide-y divide-border-subtle">
            {upcomingMeetings.map((meeting: any) => (
              <MeetingCard key={meeting._id} meeting={meeting} member={member} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
