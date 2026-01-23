import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { MemberWithProfile } from '../lib/members';
import { toast } from 'sonner';
import {
  NotificationBanner,
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
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
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
      toast.error('failed to save rsvp');
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
      if (!('serviceWorker' in navigator)) { toast.error('service worker not supported'); return; }
      const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register('/sw.js'));
      if (!reg) { toast.error('failed to register service worker'); return; }
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') { toast.error('notifications blocked'); return; }
      }
      const vapid = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY;
      if (!vapid) { toast.error('push not configured'); return; }
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
      toast.success('notifications enabled');
    } catch { toast.error('failed to enable notifications'); }
  };

  return (
    <>
      {devicePushEnabled === false && <NotificationBanner onEnable={enableDeviceNotifications} />}

      {showNewMeeting && canManageMeetings && (
        <NewMeetingModal
          onClose={() => { setShowNewMeeting(false); setQuickMeetingDate(null); }}
          member={member}
          defaultDate={quickMeetingDate}
        />
      )}

      <div className="space-y-6">
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

        {canManageMeetings && (
          <QuickActions onNewMeeting={() => setShowNewMeeting(true)} onQuickMeeting={handleQuickMeeting} />
        )}

        <div className="glass-panel p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h2 className="text-2xl font-light">meeting calendar</h2>
            <button className="btn-modern touch-feedback" onClick={() => setViewMode(viewMode === 'month' ? 'week' : 'month')}>
              {viewMode === 'month' ? 'week view' : 'month view'}
            </button>
          </div>

          <CalendarView
            meetings={meetings || []}
            selectedDate={selectedDate}
            onDateSelect={(date) => { setSelectedDate(date); setShowSelectedDate(true); }}
            onDateDoubleClick={canManageMeetings ? handleQuickMeeting : undefined}
            viewMode={viewMode}
          />

          {showSelectedDate && (
            <SelectedDatePanel
              date={selectedDate}
              meetings={meetings || []}
              members={allMembers}
              currentMember={member}
              onClose={() => setShowSelectedDate(false)}
            />
          )}
        </div>

        {upcomingMeetings && upcomingMeetings.length > 1 && (
          <div className="glass-panel p-8">
            <h2 className="text-2xl font-light mb-6">all upcoming meetings</h2>
            <div className="space-y-4">
              {upcomingMeetings.map((meeting: any) => (
                <MeetingCard key={meeting._id} meeting={meeting} member={member} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
