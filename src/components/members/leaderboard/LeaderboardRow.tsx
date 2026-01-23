import { Clock, Sparkles, ChevronRight } from 'lucide-react';
import { ProfileAvatar } from '../../ProfileAvatar';
import { LeaderboardEntry } from '../types';
import { cn } from '../../../lib/utils';
import { Badge } from '../../ui';

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  rank: number;
  leaderPoints: number;
  formatPoints: (value: number) => string;
  formatAwardDate: (timestamp: number | null) => string;
  formatHours: (valueMs: number) => string;
  isYou: boolean;
  isHoursHero: boolean;
  isDoubleChampion: boolean;
  onSelect: () => void;
}

export function LeaderboardRow({
  entry,
  rank,
  leaderPoints,
  formatPoints,
  formatAwardDate,
  formatHours,
  isYou,
  isHoursHero,
  isDoubleChampion,
  onSelect,
}: LeaderboardRowProps) {
  const progressRaw = leaderPoints
    ? Math.min(100, Math.max(4, Math.round((entry.totalPoints / leaderPoints) * 100)))
    : 0;
  const attendanceHoursLabel = formatHours(entry.totalAttendanceMs);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left p-4 rounded-xl border transition-colors',
        isDoubleChampion
          ? 'bg-accent-success/5 border-accent-success/30 hover:bg-accent-success/10'
          : 'bg-bg-secondary border-border hover:bg-bg-tertiary'
      )}
    >
      <div className="flex items-center gap-4">
        {/* Rank */}
        <div className="w-8 h-8 rounded-lg bg-bg-tertiary border border-border flex items-center justify-center text-sm font-medium text-text-muted shrink-0">
          {rank}
        </div>

        {/* Avatar */}
        <ProfileAvatar
          name={entry.name}
          imageUrl={entry.profileImageUrl}
          size="md"
          className={cn(
            'shrink-0',
            isDoubleChampion && 'ring-2 ring-accent-success/50',
            isHoursHero && !isDoubleChampion && 'ring-2 ring-accent/50'
          )}
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-text-primary truncate">{entry.name}</span>
            {isYou && (
              <span className="text-xs text-accent bg-accent/10 px-1.5 py-0.5 rounded">You</span>
            )}
            {isDoubleChampion && (
              <Badge variant="success" className="flex items-center gap-1 text-[10px]">
                <Sparkles size={10} />
                Double Crown
              </Badge>
            )}
            {!isDoubleChampion && isHoursHero && (
              <Badge variant="default" className="flex items-center gap-1 text-[10px]">
                <Clock size={10} />
                Hours Hero
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
            <span>{entry.awardsCount} {entry.awardsCount === 1 ? 'award' : 'awards'}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock size={10} className="text-accent-success" />
              {attendanceHoursLabel}h
            </span>
          </div>
        </div>

        {/* Points */}
        <div className="text-right shrink-0">
          <span className="text-lg font-semibold text-accent-orange">
            +{formatPoints(entry.totalPoints)}
          </span>
          <p className="text-[10px] text-text-muted uppercase tracking-wide">μpts</p>
        </div>

        <ChevronRight size={16} className="text-text-muted shrink-0" />
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isDoubleChampion ? 'bg-accent-success' : 'bg-accent-orange'
          )}
          style={{ width: `${progressRaw}%` }}
        />
      </div>
    </button>
  );
}
