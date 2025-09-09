import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface MeetingsPanelProps {
  member: Doc<"members">;
}

export function MeetingsPanel({ member }: MeetingsPanelProps) {
  const meetings = useQuery(api.meetings.getMeetings) || [];
  const createMeeting = useMutation(api.meetings.createMeeting);
  const updateMeeting = useMutation(api.meetings.updateMeeting);
  const deleteMeeting = useMutation(api.meetings.deleteMeeting);

  const [showForm, setShowForm] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Doc<"meetings"> | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
  });

  const canManageMeetings = member.role === "admin" || member.role === "lead";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const dateMs = new Date(formData.date).getTime();
      
      if (editingMeeting) {
        await updateMeeting({
          meetingId: editingMeeting._id,
          title: formData.title,
          description: formData.description || undefined,
          date: dateMs,
          startTime: formData.startTime,
          endTime: formData.endTime,
          location: formData.location || undefined,
        });
        toast.success("Meeting updated successfully!");
      } else {
        await createMeeting({
          title: formData.title,
          description: formData.description || undefined,
          date: dateMs,
          startTime: formData.startTime,
          endTime: formData.endTime,
          location: formData.location || undefined,
        });
        toast.success("Meeting created successfully!");
      }
      
      resetForm();
    } catch (error) {
      toast.error("Failed to save meeting");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      date: "",
      startTime: "",
      endTime: "",
      location: "",
    });
    setShowForm(false);
    setEditingMeeting(null);
  };

  const handleEdit = (meeting: Doc<"meetings">) => {
    setFormData({
      title: meeting.title,
      description: meeting.description || "",
      date: new Date(meeting.date).toISOString().split('T')[0],
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      location: meeting.location || "",
    });
    setEditingMeeting(meeting);
    setShowForm(true);
  };

  const handleDelete = async (meetingId: string) => {
    if (confirm("Are you sure you want to delete this meeting?")) {
      try {
        await deleteMeeting({ meetingId: meetingId as any });
        toast.success("Meeting deleted successfully!");
      } catch (error) {
        toast.error("Failed to delete meeting");
      }
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white">Meeting Schedule</h3>
        {canManageMeetings && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            + Schedule Meeting
          </button>
        )}
      </div>

      {/* Meeting Form */}
      {showForm && (
        <div className="glass-panel p-6">
          <h4 className="text-lg font-medium text-white mb-4">
            {editingMeeting ? "Edit Meeting" : "Schedule New Meeting"}
          </h4>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="input-field"
                  placeholder="e.g., Room 101, Workshop"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field"
                rows={3}
                placeholder="Meeting agenda, topics to discuss..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Start Time *
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  End Time *
                </label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button type="submit" className="btn-primary">
                {editingMeeting ? "Update Meeting" : "Schedule Meeting"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Meetings List */}
      <div className="space-y-4">
        {meetings.length === 0 ? (
          <div className="glass-panel p-8 text-center">
            <p className="text-gray-400">No meetings scheduled yet.</p>
            {canManageMeetings && (
              <p className="text-sm text-gray-500 mt-2">
                Click "Schedule Meeting" to add the first meeting.
              </p>
            )}
          </div>
        ) : (
          meetings.map((meeting) => (
            <div key={meeting._id} className="glass-panel p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-lg font-medium text-white mb-2">
                    {meeting.title}
                  </h4>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300 mb-3">
                    <div className="flex items-center space-x-2">
                      <span>📅</span>
                      <span>{formatDate(meeting.date)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span>⏰</span>
                      <span>{formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}</span>
                    </div>
                    {meeting.location && (
                      <div className="flex items-center space-x-2">
                        <span>📍</span>
                        <span>{meeting.location}</span>
                      </div>
                    )}
                  </div>
                  
                  {meeting.description && (
                    <p className="text-gray-400 text-sm">{meeting.description}</p>
                  )}
                </div>
                
                {canManageMeetings && (
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleEdit(meeting)}
                      className="text-cyan-400 hover:text-cyan-300 p-2 rounded-lg hover:bg-white/5 transition-colors"
                      title="Edit meeting"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(meeting._id)}
                      className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-white/5 transition-colors"
                      title="Delete meeting"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
