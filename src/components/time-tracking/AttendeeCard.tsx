import { ProfileAvatar } from '../ProfileAvatar';
import { MemberWithProfile } from '../../lib/members';

interface AttendeeCardProps {
  session: any;
  member: MemberWithProfile | undefined;
  duration: { durationMs: number } | undefined;
  lastSeenAt: number;
  now: number;
}

export function AttendeeCard({ session, member, duration, lastSeenAt, now }: AttendeeCardProps) {
  const displayName = member ? member.name : session.memberId.slice(-6);
  const avatarUrl = member?.profileImageUrl ?? null;

  return (
    <div className="flex items-center justify-between p-3 bg-glass border border-border-glass rounded-xl">
      <div className="flex items-center gap-3">
        <ProfileAvatar
          name={displayName}
          imageUrl={avatarUrl}
          size="md"
          className="border border-border-glass"
        />
        <div>
          <div className="font-medium">{displayName}</div>
          <div className="text-xs text-text-muted">
            since {new Date(session.startTime).toLocaleTimeString()}
          </div>
          {duration && (
            <div className="text-xs text-accent-green mt-1">
              total: {(duration.durationMs / (1000 * 60)).toFixed(0)} mins
            </div>
          )}
        </div>
      </div>
      <div className="text-xs text-text-dim">
        last seen {Math.round((now - lastSeenAt) / 1000)}s ago
      </div>
    </div>
  );
}
