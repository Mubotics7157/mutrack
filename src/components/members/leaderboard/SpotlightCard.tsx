import { Crown, Trophy, Clock, Sparkles } from 'lucide-react';
import { ProfileAvatar } from '../../ProfileAvatar';
import { LeaderboardEntry } from '../types';
import { cn } from '../../../lib/utils';
import { Badge } from '../../ui';

interface SpotlightCardProps {
  entry: LeaderboardEntry;
  index: number;
  formatPoints: (value: number) => string;
  formatAwardDate: (timestamp: number | null) => string;
  formatHours: (valueMs: number) => string;
  isYou: boolean;
  isHoursHero: boolean;
  isDoubleChampion: boolean;
  onSelect: () => void;
}

function getRankStyles(index: number) {
  switch (index) {
    case 0:
      return {
        border: 'border-accent-orange/50',
        bg: 'bg-accent-orange/10',
        accent: 'text-accent-orange',
        icon: Crown,
      };
    case 1:
      return {
        border: 'border-zinc-400/40',
        bg: 'bg-zinc-500/10',
        accent: 'text-zinc-300',
        icon: Trophy,
      };
    case 2:
      return {
        border: 'border-accent/40',
        bg: 'bg-accent/10',
        accent: 'text-accent',
        icon: Trophy,
      };
    default:
      return {
        border: 'border-border',
        bg: 'bg-bg-tertiary',
        accent: 'text-text-muted',
        icon: Trophy,
      };
  }
}

export function SpotlightCard({
  entry,
  index,
  formatPoints,
  formatAwardDate,
  formatHours,
  isYou,
  isHoursHero,
  isDoubleChampion,
  onSelect,
}: SpotlightCardProps) {
  const styles = getRankStyles(index);
  const IconComponent = styles.icon;

  const attendanceSummary =
    entry.totalAttendanceMs > 0
      ? `${formatHours(entry.totalAttendanceMs)}h · ${entry.attendanceMeetingsCount} ${
          entry.attendanceMeetingsCount === 1 ? 'meeting' : 'meetings'
        }`
      : 'No hours yet';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'relative w-full min-w-[280px] flex-shrink-0 snap-center rounded-xl border p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98]',
        isDoubleChampion
          ? 'border-accent-success/50 bg-accent-success/5'
          : cn(styles.border, styles.bg)
      )}
    >
      {/* Rank badge */}
      <div className="flex items-start justify-between mb-4">
        <div className={cn('flex items-center gap-2', styles.accent)}>
          <IconComponent size={20} />
          <span className="text-sm font-semibold">#{index + 1}</span>
        </div>
        {isDoubleChampion && (
          <Badge variant="success" className="flex items-center gap-1">
            <Sparkles size={12} />
            Double Crown
          </Badge>
        )}
        {!isDoubleChampion && isHoursHero && (
          <Badge variant="default" className="flex items-center gap-1">
            <Clock size={12} />
            Hours Hero
          </Badge>
        )}
      </div>

      {/* Profile */}
      <div className="flex items-center gap-3 mb-4">
        <ProfileAvatar
          name={entry.name}
          imageUrl={entry.profileImageUrl}
          size="lg"
          className={cn(
            'ring-2',
            isDoubleChampion
              ? 'ring-accent-success/50'
              : index === 0
                ? 'ring-accent-orange/50'
                : 'ring-border'
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-text-primary truncate">{entry.name}</h4>
            {isYou && (
              <span className="text-xs text-accent bg-accent/10 px-2 py-0.5 rounded-full shrink-0">
                You
              </span>
            )}
          </div>
          <p className="text-sm text-text-muted truncate">{entry.email}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className={cn('text-3xl font-semibold', styles.accent)}>
            +{formatPoints(entry.totalPoints)}
          </span>
          <span className="text-xs text-text-muted uppercase tracking-wide">μpoints</span>
        </div>
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>
            {entry.awardsCount === 0
              ? 'No awards yet'
              : `${entry.awardsCount} ${entry.awardsCount === 1 ? 'award' : 'awards'}`}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} className="text-accent-success" />
            {attendanceSummary}
          </span>
        </div>
      </div>
    </button>
  );
}
