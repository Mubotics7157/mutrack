import { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Radio, Clock, UserCheck } from 'lucide-react';

export function ActiveAttendanceStatus() {
  const activeSession = useQuery(api.attendance.getMyActiveSession);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // undefined = still loading, null = no active session
  if (activeSession === undefined || activeSession === null) return null;

  const { session, meeting } = activeSession;
  const durationMs = now - session.startTime;
  const durationMins = Math.floor(durationMs / (1000 * 60));
  const durationSecs = Math.floor((durationMs % (1000 * 60)) / 1000);

  return (
    <div className="bg-accent-success/10 border border-accent-success/30 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent-success/20 rounded-full flex items-center justify-center">
            {session.isManual ? (
              <UserCheck size={20} className="text-accent-success" />
            ) : (
              <Radio size={20} className="text-accent-success animate-pulse" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-text-primary">You're being tracked</span>
              {session.isManual && (
                <span className="text-xs px-1.5 py-0.5 bg-accent/10 text-accent rounded font-medium">
                  Manual
                </span>
              )}
            </div>
            <p className="text-sm text-text-muted">{meeting.title}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1.5 text-accent-success font-mono text-lg font-semibold">
            <Clock size={16} />
            {durationMins}:{durationSecs.toString().padStart(2, '0')}
          </div>
          <p className="text-xs text-text-muted">
            Since {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    </div>
  );
}
