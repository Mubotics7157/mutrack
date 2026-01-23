import { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { MemberWithProfile } from '../../lib/members';
import { AttendeeCard } from './AttendeeCard';
import { toast } from 'sonner';

interface ActiveAttendeesListProps {
  meetingId: Id<'meetings'> | '';
  durations: Array<{
    memberId: string;
    earliestStart: number;
    latestEnd: number;
    durationMs: number;
  }>;
  ephemeralLastSeen: Record<string, number>;
  isAdmin?: boolean;
}

export function ActiveAttendeesList({
  meetingId,
  durations,
  ephemeralLastSeen,
  isAdmin,
}: ActiveAttendeesListProps) {
  const sessions = useQuery(
    api.attendance.getActiveSessionsForMeeting,
    meetingId ? { meetingId: meetingId as Id<'meetings'> } : 'skip'
  );
  const [membersById, setMembersById] = useState<Record<string, MemberWithProfile>>({});
  const members =
    (useQuery(api.members.getAllMembers) as MemberWithProfile[] | undefined) || [];
  const [now, setNow] = useState<number>(Date.now());
  const manualSignOut = useMutation(api.attendance.manualSignOut);

  useEffect(() => {
    const map: Record<string, MemberWithProfile> = {};
    for (const m of members) map[m._id] = m;
    setMembersById(map);
  }, [members]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!meetingId) {
    return (
      <div className="text-center py-8">
        <p className="text-text-muted text-sm">Select a meeting to see active attendees</p>
      </div>
    );
  }
  if (sessions === undefined) {
    return (
      <div className="text-center py-8">
        <p className="text-text-muted text-sm">Loading...</p>
      </div>
    );
  }
  if (sessions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-text-muted text-sm">No active attendees yet</p>
        <p className="text-text-dim text-xs mt-1">Start scanning to detect beacons</p>
      </div>
    );
  }

  const handleSignOut = async (sessionId: Id<'attendanceSessions'>) => {
    try {
      await manualSignOut({ sessionId });
      toast.success('Member signed out');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to sign out');
    }
  };

  return (
    <div className="space-y-2">
      {sessions.map((s: any) => {
        const member = membersById[s.memberId];
        const duration = durations.find((x) => x.memberId === s.memberId);
        const lastSeenAt = ephemeralLastSeen[s.memberId] || s.lastSeenAt;

        return (
          <AttendeeCard
            key={s._id}
            session={s}
            member={member}
            duration={duration}
            lastSeenAt={lastSeenAt}
            now={now}
            isManual={s.isManual === true}
            canSignOut={isAdmin}
            onSignOut={() => handleSignOut(s._id)}
          />
        );
      })}
    </div>
  );
}
