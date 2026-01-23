import { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { MemberWithProfile } from '../../lib/members';
import { AttendeeCard } from './AttendeeCard';

interface ActiveAttendeesListProps {
  meetingId: Id<'meetings'> | '';
  durations: Array<{
    memberId: string;
    earliestStart: number;
    latestEnd: number;
    durationMs: number;
  }>;
  ephemeralLastSeen: Record<string, number>;
}

export function ActiveAttendeesList({
  meetingId,
  durations,
  ephemeralLastSeen,
}: ActiveAttendeesListProps) {
  const sessions = useQuery(
    api.attendance.getActiveSessionsForMeeting,
    meetingId ? { meetingId: meetingId as Id<'meetings'> } : 'skip'
  );
  const [membersById, setMembersById] = useState<Record<string, MemberWithProfile>>({});
  const members =
    (useQuery(api.members.getAllMembers) as MemberWithProfile[] | undefined) || [];
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const map: Record<string, MemberWithProfile> = {};
    for (const m of members) map[m._id] = m;
    setMembersById(map);
  }, [members]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!meetingId) return <p className="text-text-muted text-sm">select a meeting</p>;
  if (sessions === undefined) return <p className="text-text-muted">loading...</p>;
  if (sessions.length === 0) return <p className="text-text-muted">no active attendees yet</p>;

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
          />
        );
      })}
    </div>
  );
}
