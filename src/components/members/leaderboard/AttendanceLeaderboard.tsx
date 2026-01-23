import { Clock, Sparkles, Trophy, ChevronRight } from 'lucide-react';
import { ProfileAvatar } from '../../ProfileAvatar';
import { LeaderboardEntry } from '../types';
import { type Id } from '../../../../convex/_generated/dataModel';
import { cn } from '../../../lib/utils';
import { Badge } from '../../ui';

interface AttendanceLeaderboardProps {
  entries: LeaderboardEntry[];
  formatHours: (valueMs: number) => string;
  onSelectMember: (memberId: Id<'members'>) => void;
  currentMemberId: Id<'members'>;
  doubleChampionId: Id<'members'> | null;
  pointsRoyaltyIds: Set<Id<'members'>>;
}

const rankTitles: Record<number, string> = {
  0: 'Time Titan',
  1: 'Momentum Maker',
  2: 'Clockwork Ace',
};

export function AttendanceLeaderboard({
  entries,
  formatHours,
  onSelectMember,
  currentMemberId,
  doubleChampionId,
  pointsRoyaltyIds,
}: AttendanceLeaderboardProps) {
  const leaderMs = entries[0]?.totalAttendanceMs ?? 0;

  return (
    <section className="mt-6 bg-bg-secondary border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <Clock size={20} className="text-accent-success" />
          <h3 className="text-lg font-semibold text-text-primary">Attendance Hours</h3>
        </div>
        <p className="text-sm text-text-muted mt-1">
          Celebrating time invested at meetings
        </p>
      </div>

      {/* Content */}
      {entries.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto mb-3">
            <Clock size={24} className="text-text-muted" />
          </div>
          <p className="text-sm text-text-muted">No attendance sessions recorded yet</p>
          <p className="text-xs text-text-dim mt-1">
            Once meetings are logged, this board will show top attendees
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border-subtle">
          {entries.map((entry, index) => {
            const rank = index + 1;
            const progressRaw = leaderMs
              ? Math.min(100, Math.max(4, Math.round((entry.totalAttendanceMs / leaderMs) * 100)))
              : 0;
            const isYou = entry.memberId === currentMemberId;
            const isDoubleChampion = doubleChampionId === entry.memberId;
            const isPointsRoyalty = pointsRoyaltyIds.has(entry.memberId);
            const hoursLabel = formatHours(entry.totalAttendanceMs);
            const meetingsLabel = entry.attendanceMeetingsCount === 1 ? 'meeting' : 'meetings';
            const rankTitle = rankTitles[index] ?? null;

            return (
              <button
                key={entry.memberId}
                type="button"
                onClick={() => onSelectMember(entry.memberId)}
                className={cn(
                  'w-full text-left p-4 transition-colors hover:bg-bg-tertiary',
                  isDoubleChampion && 'bg-accent-success/5 hover:bg-accent-success/10'
                )}
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium shrink-0',
                      index === 0
                        ? 'bg-accent-success/20 text-accent-success border border-accent-success/30'
                        : 'bg-bg-tertiary text-text-muted border border-border'
                    )}
                  >
                    {rank}
                  </div>

                  {/* Avatar */}
                  <ProfileAvatar
                    name={entry.name}
                    imageUrl={entry.profileImageUrl}
                    size="md"
                    className={cn(
                      'shrink-0',
                      isDoubleChampion && 'ring-2 ring-accent-success/50'
                    )}
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-text-primary truncate">{entry.name}</span>
                      {rankTitle && (
                        <Badge variant="success" className="text-[10px]">
                          {rankTitle}
                        </Badge>
                      )}
                      {isYou && (
                        <span className="text-xs text-accent-success bg-accent-success/10 px-1.5 py-0.5 rounded">
                          You
                        </span>
                      )}
                      {isDoubleChampion && (
                        <Badge variant="success" className="flex items-center gap-1 text-[10px]">
                          <Sparkles size={10} />
                          Double Crown
                        </Badge>
                      )}
                      {!isDoubleChampion && isPointsRoyalty && (
                        <Badge variant="warning" className="flex items-center gap-1 text-[10px]">
                          <Trophy size={10} />
                          μpoint Royalty
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                      <span>
                        {entry.attendanceMeetingsCount} {meetingsLabel}
                      </span>
                      <span>·</span>
                      <span>{entry.attendanceSessionCount} check-ins</span>
                    </div>
                  </div>

                  {/* Hours */}
                  <div className="text-right shrink-0">
                    <span className="text-lg font-semibold text-accent-success">{hoursLabel}h</span>
                    <p className="text-[10px] text-text-muted uppercase tracking-wide">hours</p>
                  </div>

                  <ChevronRight size={16} className="text-text-muted shrink-0" />
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent-success transition-all"
                    style={{ width: `${progressRaw}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
