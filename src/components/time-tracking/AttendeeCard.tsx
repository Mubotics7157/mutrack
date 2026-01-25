import { Clock, Radio, UserCheck, LogOut } from 'lucide-react';
import { ProfileAvatar } from '../ProfileAvatar';
import { MemberWithProfile } from '../../lib/members';
import { cn } from '../../lib/utils';

interface AttendeeCardProps {
  session: any;
  member: MemberWithProfile | undefined;
  duration: { durationMs: number } | undefined;
  lastSeenAt: number;
  now: number;
  isManual?: boolean;
  canSignOut?: boolean;
  onSignOut?: () => void;
}

export function AttendeeCard({
  session,
  member,
  duration,
  lastSeenAt,
  now,
  isManual,
  canSignOut,
  onSignOut,
}: AttendeeCardProps) {
  const displayName = member ? member.name : session.memberId.slice(-6);
  const avatarUrl = member?.profileImageUrl ?? null;
  const secondsSinceLastSeen = Math.round((now - lastSeenAt) / 1000);
  // BLE is noisy - use 90 second threshold for "active" status to reduce flickering
  const isActive = isManual ? true : secondsSinceLastSeen < 90;

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
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-primary">{displayName}</span>
            {isManual && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-accent/10 text-accent rounded">
                <UserCheck size={10} />
                Manual
              </span>
            )}
          </div>
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
      <div className="flex items-center gap-3">
        {isManual && canSignOut && onSignOut && (
          <button
            onClick={onSignOut}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-accent-error hover:bg-accent-error/10 rounded transition-colors"
          >
            <LogOut size={12} />
            Sign Out
          </button>
        )}
        {!isManual && (
          <div className="flex items-center gap-1.5 text-xs text-text-dim">
            <Radio size={12} className={isActive ? 'text-accent-success' : ''} />
            <span>{secondsSinceLastSeen}s</span>
          </div>
        )}
      </div>
    </div>
  );
}
