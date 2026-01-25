import { useState, useEffect, useCallback } from "react";
import { Button } from "./ui";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  Calendar,
} from "lucide-react";

interface CheckInPageData {
  memberName: string;
  meetingTitle: string;
  meetingDate: number;
  meetingStartTime: string;
  meetingEndTime: string;
  meetingLocation?: string;
  isCheckedIn: boolean;
  checkInTime?: number;
  isCheckedOut: boolean;
  checkOutTime?: number;
}

type PageStatus =
  | "loading"
  | "ready"
  | "checked_in"
  | "checked_out"
  | "invalid_token"
  | "expired_token"
  | "session_invalidated"
  | "error";

export function SmsCheckInPage() {
  const [status, setStatus] = useState<PageStatus>("loading");
  const [data, setData] = useState<CheckInPageData | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract token from URL path
  const token = window.location.pathname.split("/checkin/")[1];

  const convexUrl = (import.meta.env.VITE_CONVEX_URL as string).replace(
    ".cloud",
    ".site"
  );

  const fetchStatus = useCallback(async () => {
    if (!token) {
      setStatus("invalid_token");
      return;
    }

    try {
      const response = await fetch(
        `${convexUrl}/api/sms-checkin/status?token=${encodeURIComponent(token)}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error === "invalid_token") {
          setStatus("invalid_token");
        } else if (errorData.error === "expired_token") {
          setStatus("expired_token");
        } else if (errorData.error === "session_invalidated") {
          setStatus("session_invalidated");
        } else {
          setStatus("error");
          setError(errorData.error || "Unknown error");
        }
        return;
      }

      const pageData: CheckInPageData = await response.json();
      setData(pageData);

      if (pageData.isCheckedOut) {
        setStatus("checked_out");
      } else if (pageData.isCheckedIn) {
        setStatus("checked_in");
      } else {
        setStatus("ready");
      }
    } catch (err) {
      console.error("Error fetching status:", err);
      setStatus("error");
      setError("Failed to load check-in page");
    }
  }, [token, convexUrl]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`${convexUrl}/api/sms-checkin/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Check-in failed");
        return;
      }

      await fetchStatus();
    } catch (err) {
      console.error("Check-in error:", err);
      setError("Failed to check in. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`${convexUrl}/api/sms-checkin/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Check-out failed");
        return;
      }

      await fetchStatus();
    } catch (err) {
      console.error("Check-out error:", err);
      setError("Failed to check out. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Error states
  if (status === "invalid_token") {
    return (
      <ErrorPage
        icon={<XCircle className="w-16 h-16 text-accent-error" />}
        title="Invalid Link"
        message="This check-in link is not valid. Please use the link from your SMS message."
      />
    );
  }

  if (status === "expired_token") {
    return (
      <ErrorPage
        icon={<Clock className="w-16 h-16 text-text-muted" />}
        title="Link Expired"
        message="This check-in link has expired. Check-in links are only valid for the duration of the meeting."
      />
    );
  }

  if (status === "session_invalidated") {
    return (
      <ErrorPage
        icon={<AlertTriangle className="w-16 h-16 text-accent-warning" />}
        title="Session Invalidated"
        message="Your attendance session was invalidated because you didn't check out. Unfortunately, your hours for this meeting won't be counted. Please remember to check out in the future."
      />
    );
  }

  if (status === "error") {
    return (
      <ErrorPage
        icon={<XCircle className="w-16 h-16 text-accent-error" />}
        title="Something Went Wrong"
        message={error || "An unexpected error occurred. Please try again later."}
      />
    );
  }

  if (status === "loading" || !data) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-accent animate-spin" />
          <p className="text-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary p-4 safe-top safe-bottom">
      <div className="max-w-md mx-auto pt-8 pb-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-accent rounded-2xl flex items-center justify-center font-bold text-xl text-white shadow-glow-accent mx-auto mb-4">
            μ
          </div>
          <h1 className="text-xl font-semibold text-text-primary mb-1">
            Hi, {data.memberName}!
          </h1>
          <p className="text-sm text-text-muted">Meeting Check-In</p>
        </div>

        {/* Meeting Info Card */}
        <div className="bg-bg-secondary border border-border rounded-2xl p-5 mb-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            {data.meetingTitle}
          </h2>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Calendar size={18} className="text-text-muted shrink-0" />
              <span className="text-text-secondary">
                {formatDate(data.meetingDate)}
              </span>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Clock size={18} className="text-text-muted shrink-0" />
              <span className="text-text-secondary">
                {formatTime(data.meetingStartTime)} -{" "}
                {formatTime(data.meetingEndTime)}
              </span>
            </div>

            {data.meetingLocation && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin size={18} className="text-text-muted shrink-0" />
                <span className="text-text-secondary">{data.meetingLocation}</span>
              </div>
            )}
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-accent-warning/10 border border-accent-warning/30 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <AlertTriangle
              size={20}
              className="text-accent-warning shrink-0 mt-0.5"
            />
            <div>
              <p className="text-sm font-medium text-accent-warning">
                Important Reminder
              </p>
              <p className="text-xs text-text-muted mt-1">
                Remember to check out when you leave! If you don't check out, your
                attendance hours won't be counted.
              </p>
            </div>
          </div>
        </div>

        {/* Status and Actions */}
        {status === "ready" && (
          <div className="space-y-4">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={actionLoading}
              icon={<LogIn size={20} />}
              onClick={handleCheckIn}
            >
              Check In
            </Button>
          </div>
        )}

        {status === "checked_in" && (
          <div className="space-y-4">
            <div className="bg-accent-success/10 border border-accent-success/30 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle size={24} className="text-accent-success shrink-0" />
              <div>
                <p className="text-sm font-medium text-accent-success">
                  You're Checked In
                </p>
                {data.checkInTime && (
                  <p className="text-xs text-text-muted mt-0.5">
                    Since {formatTimestamp(data.checkInTime)}
                  </p>
                )}
              </div>
            </div>

            <Button
              variant="danger"
              size="lg"
              fullWidth
              loading={actionLoading}
              icon={<LogOut size={20} />}
              onClick={handleCheckOut}
            >
              Check Out
            </Button>
          </div>
        )}

        {status === "checked_out" && (
          <div className="space-y-4">
            <div className="bg-bg-tertiary border border-border rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle size={24} className="text-accent-success shrink-0" />
                <p className="text-sm font-medium text-text-primary">
                  Attendance Complete
                </p>
              </div>

              <div className="text-sm text-text-muted space-y-1">
                {data.checkInTime && (
                  <p>Checked in: {formatTimestamp(data.checkInTime)}</p>
                )}
                {data.checkOutTime && (
                  <p>Checked out: {formatTimestamp(data.checkOutTime)}</p>
                )}
                {data.checkInTime && data.checkOutTime && (
                  <p className="text-text-secondary font-medium pt-1">
                    Duration:{" "}
                    {formatDuration(data.checkOutTime - data.checkInTime)}
                  </p>
                )}
              </div>
            </div>

            <p className="text-center text-sm text-text-muted">
              Thank you for attending! Your hours have been recorded.
            </p>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="mt-4 bg-accent-error/10 border border-accent-error/30 rounded-xl p-4">
            <p className="text-sm text-accent-error">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ErrorPage({
  icon,
  title,
  message,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
}) {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="max-w-sm text-center">
        <div className="mb-6 flex justify-center">{icon}</div>
        <h1 className="text-xl font-semibold text-text-primary mb-2">{title}</h1>
        <p className="text-sm text-text-muted">{message}</p>
      </div>
    </div>
  );
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
