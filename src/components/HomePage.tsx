import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface HomePageProps {
  member: Doc<"members">;
}

export function HomePage({ member }: HomePageProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  
  const meetings = useQuery(api.meetings.getMeetings);
  const upcomingMeetings = meetings?.filter((m: any) => 
    new Date(m.date) >= new Date()
  ).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="glass-panel p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-light mb-2 text-gradient">
            welcome back, {member.name}
          </h1>
          <p className="text-text-muted">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }).toLowerCase()}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickStat 
            label="upcoming meetings" 
            value={upcomingMeetings?.length || 0}
            color="text-accent-purple"
          />
          <QuickStat 
            label="attendance rate" 
            value="92%"
            color="text-accent-green"
          />
          <QuickStat 
            label="team members" 
            value="24"
            color="text-sunset-orange"
          />
        </div>
      </div>

      {/* Calendar Section */}
      <div className="glass-panel p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h2 className="text-2xl font-light">meeting calendar</h2>
          <div className="flex gap-2">
            <button 
              className="btn-modern"
              onClick={() => setViewMode(viewMode === "month" ? "week" : "month")}
            >
              {viewMode === "month" ? "week view" : "month view"}
            </button>
            <button 
              className="btn-modern btn-primary"
              onClick={() => setShowNewMeeting(true)}
            >
              + schedule meeting
            </button>
          </div>
        </div>

        <CalendarView 
          meetings={meetings || []}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          viewMode={viewMode}
        />
      </div>

      {/* Upcoming Meetings */}
      <div className="glass-panel p-8">
        <h2 className="text-2xl font-light mb-6">upcoming meetings</h2>
        
        {upcomingMeetings && upcomingMeetings.length > 0 ? (
          <div className="space-y-4">
            {upcomingMeetings.map((meeting: any) => (
              <MeetingCard key={meeting._id} meeting={meeting} member={member} />
            ))}
          </div>
        ) : (
          <p className="text-text-muted text-center py-8">
            no upcoming meetings scheduled
          </p>
        )}
      </div>

      {/* New Meeting Modal */}
      {showNewMeeting && (
        <NewMeetingModal 
          onClose={() => setShowNewMeeting(false)}
          member={member}
        />
      )}
    </div>
  );
}

interface QuickStatProps {
  label: string;
  value: string | number;
  color: string;
}

function QuickStat({ label, value, color }: QuickStatProps) {
  return (
    <div className="card-modern text-center">
      <div className={`text-3xl font-light mb-2 ${color}`}>
        {value}
      </div>
      <div className="text-sm text-text-muted">
        {label}
      </div>
    </div>
  );
}

interface CalendarViewProps {
  meetings: any[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  viewMode: "month" | "week";
}

function CalendarView({ meetings, selectedDate, onDateSelect, viewMode }: CalendarViewProps) {
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

  const days = viewMode === "month" 
    ? getDaysInMonth(selectedDate)
    : getWeekDays(selectedDate);

  const hasMeeting = (date: Date | null) => {
    if (!date) return false;
    return meetings.some((m: any) => {
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
          ←
        </button>
        
        <h3 className="text-lg font-mono text-text-secondary">
          {selectedDate.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
          }).toLowerCase()}
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
          →
        </button>
      </div>

      {/* Day Labels */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map(day => (
          <div key={day} className="text-center text-xs text-text-muted font-mono py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-1 bg-border-glass p-1 rounded-xl">
        {days.map((date, index) => (
          <div
            key={index}
            className={`
              calendar-day
              ${date && isToday(date) ? 'today' : ''}
              ${date && hasMeeting(date) ? 'has-event' : ''}
            `}
            onClick={() => date && onDateSelect(date)}
            style={{ 
              cursor: date ? "pointer" : "default",
              opacity: date ? 1 : 0.3
            }}
          >
            {date && (
              <span className="text-sm font-light">
                {date.getDate()}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface MeetingCardProps {
  meeting: any;
  member: Doc<"members">;
}

function MeetingCard({ meeting, member }: MeetingCardProps) {
  const markAttendance = useMutation(api.meetings.markAttendance);
  const attendance = meeting.attendance?.find((a: any) => a.memberId === member._id);
  
  const handleAttendance = async (status: "present" | "absent") => {
    await markAttendance({
      meetingId: meeting._id,
      status
    });
    toast.success(`attendance marked as ${status}`);
  };

  return (
    <div className="card-modern flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h3 className="text-lg font-light mb-1">
          {meeting.title}
        </h3>
        <p className="text-sm text-text-muted">
          {new Date(meeting.date).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          }).toLowerCase()}
        </p>
        {meeting.location && (
          <p className="text-xs text-text-dim mt-1">
            📍 {meeting.location}
          </p>
        )}
      </div>
      
      <div className="flex gap-2">
        {!attendance ? (
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
        )}
      </div>
    </div>
  );
}

interface NewMeetingModalProps {
  onClose: () => void;
  member: Doc<"members">;
}

function NewMeetingModal({ onClose, member }: NewMeetingModalProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  
  const createMeeting = useMutation(api.meetings.createMeeting);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !date || !startTime || !endTime) {
      toast.error("please fill in all required fields");
      return;
    }

    const meetingDate = new Date(date);
    
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

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-panel p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-light mb-6">
          schedule new meeting
        </h2>
        
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
            <input
              type="text"
              className="input-modern"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., robotics lab"
            />
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
            <button type="submit" className="btn-modern btn-primary flex-1">
              schedule meeting
            </button>
            <button type="button" className="btn-modern flex-1" onClick={onClose}>
              cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}