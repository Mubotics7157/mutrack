import React, { useState } from "react";
import ReactDOM from "react-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import {
  Calendar,
  Plus,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
} from "lucide-react";

interface HomePageProps {
  member: Doc<"members">;
}

export function HomePage({ member }: HomePageProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [viewMode, setViewMode] = useState<"month" | "week">("month");

  const meetings = useQuery(api.meetings.getMeetings);
  const rsvpToMeeting = useMutation(api.meetings.rsvpToMeeting);
  const [rsvpSubmitting, setRsvpSubmitting] = useState(false);
  const upcomingMeetings = meetings
    ?.filter((m: any) => new Date(m.date) >= new Date())
    .slice(0, 5);

  // Quick meeting creation with smart defaults
  const [quickMeetingDate, setQuickMeetingDate] = useState<Date | null>(null);

  const handleQuickMeeting = (date: Date) => {
    setQuickMeetingDate(date);
    setShowNewMeeting(true);
  };

  // Find the next meeting
  const nextMeeting = upcomingMeetings?.[0];
  const myRsvp = useQuery(
    api.meetings.getMyRsvpForMeeting,
    nextMeeting ? { meetingId: nextMeeting._id } : "skip"
  );
  const currentRsvpStatus: "attending" | "not_attending" | undefined =
    myRsvp?.status;
  const getTimeUntilMeeting = (meetingDate: Date) => {
    const now = new Date();
    const diff = meetingDate.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `in ${days} day${days > 1 ? "s" : ""}`;
    } else if (hours > 0) {
      return `in ${hours} hour${hours > 1 ? "s" : ""}`;
    } else {
      return "soon";
    }
  };

  return (
    <>
      {/* New Meeting Modal - Outside main content flow */}
      {showNewMeeting && (
        <NewMeetingModal
          onClose={() => {
            setShowNewMeeting(false);
            setQuickMeetingDate(null);
          }}
          member={member}
          defaultDate={quickMeetingDate}
        />
      )}

      <div className="space-y-6">
        {/* Welcome & Next Meeting Header */}
        <div className="glass-panel p-6">
          <h1 className="text-2xl font-light mb-4 text-gradient">
            welcome, {member.name}
          </h1>
          {nextMeeting ? (
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-lg font-light mb-1">
                  next meeting:{" "}
                  <span className="text-sunset-orange">
                    {nextMeeting.title}
                  </span>
                </h2>
                <p className="text-text-muted flex items-center gap-2">
                  <Clock size={14} />
                  {new Date(nextMeeting.date)
                    .toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })
                    .toLowerCase()}{" "}
                  at {nextMeeting.startTime}
                  <span className="text-accent-green ml-2">
                    {getTimeUntilMeeting(new Date(nextMeeting.date))}
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
                  className="btn-modern btn-primary"
                  onClick={async () => {
                    if (!nextMeeting) return;
                    if (currentRsvpStatus === "attending") return;
                    try {
                      setRsvpSubmitting(true);
                      await rsvpToMeeting({
                        meetingId: nextMeeting._id,
                        status: "attending",
                      });
                    } catch (e) {
                      toast.error("failed to save rsvp");
                    } finally {
                      setRsvpSubmitting(false);
                    }
                  }}
                  disabled={rsvpSubmitting || currentRsvpStatus === "attending"}
                  aria-pressed={currentRsvpStatus === "attending"}
                >
                  {currentRsvpStatus === "attending"
                    ? "attending ✓"
                    : "rsvp: attending"}
                </button>
                <button
                  className="btn-modern"
                  onClick={async () => {
                    if (!nextMeeting) return;
                    if (currentRsvpStatus === "not_attending") return;
                    try {
                      setRsvpSubmitting(true);
                      await rsvpToMeeting({
                        meetingId: nextMeeting._id,
                        status: "not_attending",
                      });
                    } catch (e) {
                      toast.error("failed to save rsvp");
                    } finally {
                      setRsvpSubmitting(false);
                    }
                  }}
                  disabled={
                    rsvpSubmitting || currentRsvpStatus === "not_attending"
                  }
                  aria-pressed={currentRsvpStatus === "not_attending"}
                >
                  {currentRsvpStatus === "not_attending"
                    ? "can't attend ✓"
                    : "can't attend"}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-text-muted">no upcoming meetings scheduled</p>
              {(member.role === "admin" || member.role === "lead") && (
                <p className="text-sm text-text-dim mt-2">
                  use the quick actions below to schedule a meeting
                </p>
              )}
            </div>
          )}
        </div>

        {/* Quick Actions Bar - Only for admins/leads */}
        {(member.role === "admin" || member.role === "lead") && (
          <div className="flex gap-2 flex-wrap">
            <button
              className="btn-modern btn-primary flex items-center gap-2"
              onClick={() => setShowNewMeeting(true)}
            >
              <Plus size={16} />
              <span>schedule meeting</span>
            </button>
            <button
              className="btn-modern flex items-center gap-2"
              onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(16, 0, 0, 0); // Default to 4 PM
                handleQuickMeeting(tomorrow);
              }}
            >
              <Plus size={16} />
              <span>quick: tomorrow 4pm</span>
            </button>
            <button
              className="btn-modern flex items-center gap-2"
              onClick={() => {
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                nextWeek.setHours(16, 0, 0, 0);
                handleQuickMeeting(nextWeek);
              }}
            >
              <Plus size={16} />
              <span>quick: next week</span>
            </button>
          </div>
        )}

        {/* Calendar Section */}
        <div className="glass-panel p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h2 className="text-2xl font-light">meeting calendar</h2>
            <button
              className="btn-modern"
              onClick={() =>
                setViewMode(viewMode === "month" ? "week" : "month")
              }
            >
              {viewMode === "month" ? "week view" : "month view"}
            </button>
          </div>

          <CalendarView
            meetings={meetings || []}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            onDateDoubleClick={handleQuickMeeting}
            viewMode={viewMode}
          />
        </div>

        {/* All Upcoming Meetings */}
        {upcomingMeetings && upcomingMeetings.length > 1 && (
          <div className="glass-panel p-8">
            <h2 className="text-2xl font-light mb-6">all upcoming meetings</h2>
            <div className="space-y-4">
              {upcomingMeetings.map((meeting: any) => (
                <MeetingCard
                  key={meeting._id}
                  meeting={meeting}
                  member={member}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

interface CalendarViewProps {
  meetings: any[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onDateDoubleClick: (date: Date) => void;
  viewMode: "month" | "week";
}

function CalendarView({
  meetings,
  selectedDate,
  onDateSelect,
  onDateDoubleClick,
  viewMode,
}: CalendarViewProps) {
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getWeekDays = (date: Date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    const days = [];

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
    if (!date) return [];
    return meetings.filter((m: any) => {
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
      {/* Month/Week Header */}
      <div className="flex justify-between items-center mb-6">
        <button
          className="btn-modern w-10 h-10 p-0 flex items-center justify-center"
          onClick={() => {
            const newDate = new Date(selectedDate);
            if (viewMode === "month") {
              newDate.setMonth(selectedDate.getMonth() - 1);
            } else {
              newDate.setDate(selectedDate.getDate() - 7);
            }
            onDateSelect(newDate);
          }}
        >
          <ChevronLeft size={16} />
        </button>

        <h3 className="text-lg font-mono text-text-secondary">
          {selectedDate
            .toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })
            .toLowerCase()}
        </h3>

        <button
          className="btn-modern w-10 h-10 p-0 flex items-center justify-center"
          onClick={() => {
            const newDate = new Date(selectedDate);
            if (viewMode === "month") {
              newDate.setMonth(selectedDate.getMonth() + 1);
            } else {
              newDate.setDate(selectedDate.getDate() + 7);
            }
            onDateSelect(newDate);
          }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day Labels */}
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

      {/* Calendar Days */}
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
              onClick={() => date && onDateSelect(date)}
              onDoubleClick={() => date && onDateDoubleClick(date)}
              style={{
                cursor: date ? "pointer" : "default",
                opacity: date ? 1 : 0.3,
              }}
              title={
                date
                  ? `Double-click to add meeting on ${date.toLocaleDateString()}`
                  : undefined
              }
            >
              {date && (
                <>
                  <span className="text-xs md:text-sm font-light">
                    {date.getDate()}
                  </span>
                  {dayMeetings.length > 0 && (
                    <div className="mt-1">
                      <div className="text-[10px] md:text-xs text-accent-green font-mono md:hidden">
                        {dayMeetings.length}
                      </div>
                      <div className="hidden md:block text-xs text-accent-green font-mono">
                        {dayMeetings.length} meeting
                        {dayMeetings.length > 1 ? "s" : ""}
                      </div>
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

interface MeetingCardProps {
  meeting: any;
  member: Doc<"members">;
}

function MeetingCard({ meeting, member }: MeetingCardProps) {
  const deleteMeeting = useMutation(api.meetings.deleteMeeting);
  // TODO: Uncomment when markAttendance API is implemented
  // const markAttendance = useMutation(api.meetings.markAttendance);
  // const attendance = meeting.attendance?.find((a: any) => a.memberId === member._id);

  const handleAttendance = async (status: "present" | "absent") => {
    // await markAttendance({
    //   meetingId: meeting._id,
    //   status
    // });
    toast.success(`attendance feature coming soon`);
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${meeting.title}"?`)) {
      await deleteMeeting({ meetingId: meeting._id });
      toast.success("meeting deleted successfully");
    }
  };

  return (
    <div className="card-modern flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h3 className="text-lg font-light mb-1">{meeting.title}</h3>
        <div className="flex items-center gap-4 text-sm text-text-muted">
          <span className="flex items-center gap-1">
            <Clock size={14} />
            {new Date(meeting.date)
              .toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })
              .toLowerCase()}{" "}
            at {meeting.startTime}
          </span>
          {meeting.location && (
            <span className="flex items-center gap-1">
              <MapPin size={14} />
              {meeting.location}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {/* TODO: Show attendance buttons when API is ready */}
        {/* {!attendance ? (
          <>
            <button
              className="btn-modern btn-success"
              onClick={() => handleAttendance("present")}
            >
              present
            </button>
            <button
              className="btn-modern btn-danger"
              onClick={() => handleAttendance("absent")}
            >
              absent
            </button>
          </>
        ) : (
          <span className={`badge badge-${attendance.status === "present" ? "approved" : "rejected"}`}>
            {attendance.status}
          </span>
        )} */}
        {(member.role === "admin" || member.role === "lead") && (
          <button
            className="btn-modern btn-danger p-2"
            onClick={handleDelete}
            title="Delete meeting"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

interface NewMeetingModalProps {
  onClose: () => void;
  member: Doc<"members">;
  defaultDate?: Date | null;
}

function NewMeetingModal({
  onClose,
  member,
  defaultDate,
}: NewMeetingModalProps) {
  const [title, setTitle] = useState("team meeting");
  const [date, setDate] = useState(() => {
    if (defaultDate) {
      return defaultDate.toISOString().split("T")[0];
    }
    return "";
  });
  const [startTime, setStartTime] = useState(() => {
    if (defaultDate) {
      const hours = defaultDate.getHours().toString().padStart(2, "0");
      const minutes = defaultDate.getMinutes().toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    }
    return "16:00"; // Default to 4 PM
  });
  const [endTime, setEndTime] = useState(() => {
    if (defaultDate) {
      const endDate = new Date(defaultDate);
      endDate.setHours(endDate.getHours() + 2); // Default 2 hour meeting
      const hours = endDate.getHours().toString().padStart(2, "0");
      const minutes = endDate.getMinutes().toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    }
    return "18:00"; // Default to 6 PM
  });
  const [location, setLocation] = useState("robotics lab");
  const [description, setDescription] = useState("");

  const createMeeting = useMutation(api.meetings.createMeeting);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !date || !startTime || !endTime) {
      toast.error("please fill in all required fields");
      return;
    }

    // Create date at midnight local time (not UTC)
    const meetingDate = new Date(date + "T00:00:00");

    await createMeeting({
      title,
      date: meetingDate.getTime(),
      startTime,
      endTime,
      location,
      description,
    });

    toast.success("meeting scheduled successfully");
    onClose();
  };

  // Use React Portal to render modal at document body level
  return ReactDOM.createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-full max-w-lg p-4">
        <div className="glass-panel p-8 max-h-[85vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-light">
              {defaultDate
                ? `schedule meeting for ${defaultDate.toLocaleDateString()}`
                : "schedule new meeting"}
            </h2>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-2 text-sm text-text-muted">
                meeting title *
              </label>
              <input
                type="text"
                className="input-modern"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., weekly team meeting"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm text-text-muted">
                  date *
                </label>
                <input
                  type="date"
                  className="input-modern"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block mb-2 text-sm text-text-muted">
                  start time *
                </label>
                <input
                  type="time"
                  className="input-modern"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm text-text-muted">
                end time *
              </label>
              <input
                type="time"
                className="input-modern"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>

            <div>
              <label className="block mb-2 text-sm text-text-muted">
                location
              </label>
              <div className="relative">
                <MapPin
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim"
                />
                <input
                  type="text"
                  className="input-modern pl-10"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., robotics lab"
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm text-text-muted">
                description
              </label>
              <textarea
                className="input-modern resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="meeting agenda and notes..."
                rows={3}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="btn-modern btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                <span>schedule meeting</span>
              </button>
              <button
                type="button"
                className="btn-modern flex-1"
                onClick={onClose}
              >
                cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body
  );
}
