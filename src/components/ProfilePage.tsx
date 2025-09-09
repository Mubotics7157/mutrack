import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { useAuthActions } from "@convex-dev/auth/react";
import { MapPin, Clock, ChevronLeft, ChevronRight } from "lucide-react";

interface ProfilePageProps {
  member: Doc<"members">;
}

export function ProfilePage({ member }: ProfilePageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const savePush = useMutation(api.members.savePushSubscription);
  const setNotificationsEnabled = useMutation(
    api.members.setNotificationsEnabled
  );

  const { signOut } = useAuthActions();

  const [profileForm, setProfileForm] = useState({
    name: member.name,
    email: member.email,
    phone: "",
    bio: "",
  });

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Profile update logic would go here
      toast.success("profile updated successfully");
      setIsEditing(false);
    } catch (error) {
      toast.error("failed to update profile");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("signed out successfully");
  };

  const registerServiceWorker =
    async (): Promise<ServiceWorkerRegistration | null> => {
      if (!("serviceWorker" in navigator)) return null;
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        return reg;
      } catch {
        return null;
      }
    };

  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i)
      outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  };

  const extractKeys = (sub: PushSubscription) => {
    const json = sub.toJSON() as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
    return {
      endpoint: json.endpoint ?? "",
      keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
    };
  };

  const enableNotifications = async () => {
    const reg = await registerServiceWorker();
    if (!reg) {
      toast.error("service worker not supported in this browser");
      return;
    }
    if (Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("notifications were not enabled");
        return;
      }
    }
    const vapid = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY as
      | string
      | undefined;
    if (!vapid) {
      toast.error("push not configured (missing VAPID key)");
      return;
    }
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid),
    });
    const { endpoint, keys } = extractKeys(sub);
    await savePush({ endpoint, keys });
    await setNotificationsEnabled({ enabled: true });
    toast.success("notifications enabled on this device");
  };

  const getRoleBadgeClass = () => {
    switch (member.role) {
      case "admin":
        return "badge-rejected";
      case "lead":
        return "badge-pending";
      default:
        return "badge-ordered";
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp)
      .toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      .toLowerCase();
  };

  // Past meetings this user RSVP'd to
  const pastMeetings = useQuery(api.meetings.getRsvpedMeetingsForCurrentMember);

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="glass-panel p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="w-24 h-24 bg-glass border border-border-glass rounded-2xl flex items-center justify-center text-4xl font-medium text-text-primary">
            {member.name.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1">
            <h1 className="text-3xl font-light mb-2">{member.name}</h1>
            <p className="text-text-muted mb-3">{member.email}</p>
            <div className="flex flex-wrap items-center gap-4">
              <span className={`badge ${getRoleBadgeClass()}`}>
                {member.role}
              </span>
              <span className="text-sm text-text-dim">
                member since {formatDate(member.joinedAt)}
              </span>
              <span className="text-sm text-text-dim">
                id: {member._id.slice(-8)}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="btn-modern"
            >
              {isEditing ? "cancel" : "edit profile"}
            </button>
            <button onClick={handleSignOut} className="btn-modern btn-danger">
              sign out
            </button>
          </div>
        </div>
      </div>

      {/* Edit Profile Form */}
      {isEditing && (
        <div className="glass-panel p-8">
          <h2 className="text-xl font-light mb-6">edit profile information</h2>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label className="block mb-2 text-sm text-text-muted">
                full name
              </label>
              <input
                type="text"
                className="input-modern"
                value={profileForm.name}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, name: e.target.value })
                }
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-sm text-text-muted">
                email address
              </label>
              <input
                type="email"
                className="input-modern"
                value={profileForm.email}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, email: e.target.value })
                }
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-sm text-text-muted">
                phone number
              </label>
              <input
                type="tel"
                className="input-modern"
                value={profileForm.phone}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, phone: e.target.value })
                }
                placeholder="(optional)"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm text-text-muted">bio</label>
              <textarea
                className="input-modern resize-none"
                value={profileForm.bio}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, bio: e.target.value })
                }
                placeholder="tell us about yourself..."
                rows={4}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button type="submit" className="btn-modern btn-primary flex-1">
                save changes
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="btn-modern flex-1"
              >
                cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Preferences */}
      <div className="glass-panel p-8">
        <h2 className="text-xl font-light mb-6">preferences</h2>

        <div className="space-y-4">
          <div className="flex justify-between items-center p-4 bg-glass border border-border-glass rounded-xl">
            <div>
              <h3 className="text-sm font-medium text-text-primary">
                meeting reminders
              </h3>
              <p className="text-xs text-text-muted mt-1">
                enable web push on this device
              </p>
            </div>
            <button onClick={enableNotifications} className="btn-modern">
              enable on this device
            </button>
          </div>

          <div className="flex justify-between items-center p-4 bg-glass border border-border-glass rounded-xl">
            <div>
              <h3 className="text-sm font-medium text-text-primary">
                dark mode
              </h3>
              <p className="text-xs text-text-muted mt-1">
                always enabled for optimal experience
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked
                disabled
              />
              <div className="w-11 h-6 bg-glass border border-border-glass peer-focus:outline-none rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:translate-x-full"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Past meetings calendar */}
      <div className="glass-panel p-8">
        <h2 className="text-xl font-light mb-6">your past meetings</h2>
        <PastMeetingsCalendar meetings={pastMeetings || []} />
      </div>
    </div>
  );
}

interface PastMeetingsCalendarProps {
  meetings: Array<{
    _id: string;
    title: string;
    description?: string;
    date: number;
    startTime: string;
    endTime: string;
    location?: string;
  }>;
}

function PastMeetingsCalendar({ meetings }: PastMeetingsCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [] as Array<Date | null>;

    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++)
      days.push(new Date(year, month, i));
    return days;
  };

  const getWeekDays = (date: Date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    const days = [] as Array<Date>;
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const days =
    viewMode === "month"
      ? getDaysInMonth(selectedDate)
      : getWeekDays(selectedDate);

  const getMeetingsForDate = (date: Date | null) => {
    if (!date) return [] as typeof meetings;
    return meetings.filter((m) => {
      const meetingDate = new Date(m.date);
      return meetingDate.toDateString() === date.toDateString();
    });
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    return new Date().toDateString() === date.toDateString();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <button
          className="btn-modern w-10 h-10 p-0 flex items-center justify-center"
          onClick={() => {
            const newDate = new Date(selectedDate);
            if (viewMode === "month")
              newDate.setMonth(selectedDate.getMonth() - 1);
            else newDate.setDate(selectedDate.getDate() - 7);
            setSelectedDate(newDate);
          }}
        >
          <ChevronLeft size={16} />
        </button>

        <h3 className="text-lg font-mono text-text-secondary">
          {selectedDate
            .toLocaleDateString("en-US", { month: "long", year: "numeric" })
            .toLowerCase()}
        </h3>

        <button
          className="btn-modern w-10 h-10 p-0 flex items-center justify-center"
          onClick={() => {
            const newDate = new Date(selectedDate);
            if (viewMode === "month")
              newDate.setMonth(selectedDate.getMonth() + 1);
            else newDate.setDate(selectedDate.getDate() + 7);
            setSelectedDate(newDate);
          }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="flex justify-end mb-4">
        <button
          className="btn-modern"
          onClick={() => setViewMode(viewMode === "month" ? "week" : "month")}
        >
          {viewMode === "month" ? "week view" : "month view"}
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {["sun", "mon", "tue", "wed", "thu", "fri", "sat"].map((day) => (
          <div
            key={day}
            className="text-center text-xs text-text-muted font-mono py-1 md:py-2"
          >
            <span className="hidden md:inline">{day}</span>
            <span className="md:hidden">{day.charAt(0)}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5 md:gap-1 bg-border-glass p-0.5 md:p-1 rounded-xl">
        {days.map((date, index) => {
          const dayMeetings = date ? getMeetingsForDate(date) : [];
          return (
            <div
              key={index}
              className={`
                calendar-day relative
                ${date && isToday(date) ? "today" : ""}
                ${dayMeetings.length > 0 ? "has-event" : ""}
              `}
              style={{
                cursor: date ? "pointer" : "default",
                opacity: date ? 1 : 0.3,
              }}
            >
              {date && (
                <>
                  <span className="text-xs md:text-sm font-light">
                    {date.getDate()}
                  </span>
                  {dayMeetings.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {dayMeetings.slice(0, 2).map((m, idx) => (
                        <div
                          key={idx}
                          className="text-[9px] md:text-[10px] text-accent-green"
                        >
                          <div className="font-mono">
                            <Clock size={10} className="inline mr-1" />
                            {m.startTime}
                          </div>
                          {m.location && (
                            <div className="text-text-dim truncate hidden md:block">
                              <MapPin size={10} className="inline mr-1" />
                              {m.location}
                            </div>
                          )}
                        </div>
                      ))}
                      {dayMeetings.length > 2 && (
                        <div className="text-[9px] text-text-dim">
                          +{dayMeetings.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
