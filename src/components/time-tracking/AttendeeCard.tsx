import { Clock, Radio } from 'lucide-react';
import { ProfileAvatar } from '../ProfileAvatar';
import { MemberWithProfile } from '../../lib/members';
import { cn } from '../../lib/utils';

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
  const secondsSinceLastSeen = Math.round((now - lastSeenAt) / 1000);
  const isActive = secondsSinceLastSeen < 30;

  return (
    <div className="flex items-center justify-between p-4 bg-bg-tertiary border border-border rounded-xl">
      <div className="flex items-center gap-3">
        <div className="relative">
          <ProfileAvatar
            name={displayName}
            imageUrl={avatarUrl}
            size="md"
          />
          <div
            className={cn(
              'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-bg-tertiary',
              isActive ? 'bg-accent-success' : 'bg-text-muted'
            )}
          />
        </div>
        <div>
          <div className="font-medium text-text-primary">{displayName}</div>
          <div className="flex items-center gap-3 text-xs text-text-muted mt-0.5">
            <span className="flex items-center gap-1">
              <Clock size={10} />
              Since {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {duration && (
              <span className="text-accent-success font-medium">
                {(duration.durationMs / (1000 * 60)).toFixed(0)} min
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-text-dim">
        <Radio size={12} className={isActive ? 'text-accent-success' : ''} />
        <span>{secondsSinceLastSeen}s</span>
      </div>
    </div>
  );
}
