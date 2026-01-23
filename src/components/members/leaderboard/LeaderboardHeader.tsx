import { Trophy, Clock, Award, Crown, Sparkles } from 'lucide-react';
import { LeaderboardRange } from '../types';
import { cn } from '../../../lib/utils';

interface LeaderboardHeaderProps {
  leaderboardRange: LeaderboardRange;
  onSelectRange: (range: LeaderboardRange) => void;
  displayTotalPoints: string;
  displayTotalAwards: string;
  displayAttendanceLabel: string;
  topPointsName: string | null;
  topHoursName: string | null;
  doubleChampionId: string | null;
  canAwardPoints: boolean;
}

const rangeOptions: Array<{ value: LeaderboardRange; label: string }> = [
  { value: 'allTime', label: 'All Time' },
  { value: 'lastMonth', label: 'Month' },
  { value: 'lastWeek', label: 'Week' },
];

export function LeaderboardHeader({
  leaderboardRange,
  onSelectRange,
  displayTotalPoints,
  displayTotalAwards,
  displayAttendanceLabel,
  topPointsName,
  topHoursName,
  doubleChampionId,
  canAwardPoints,
}: LeaderboardHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Title & Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Trophy size={20} className="text-accent-orange" />
            <h2 className="text-lg font-semibold text-text-primary">Leaderboard</h2>
          </div>
          <p className="text-sm text-text-muted mt-1">
            {canAwardPoints
              ? 'Tap a teammate to award points or view their history'
              : 'Tap to view point history'}
          </p>
        </div>

        {/* Range Selector */}
        <div className="flex rounded-lg border border-border overflow-hidden bg-bg-tertiary">
          {rangeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelectRange(option.value)}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors',
                option.value === leaderboardRange
                  ? 'bg-accent text-white'
                  : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-bg-secondary border border-border rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-accent-orange mb-1">
            <Trophy size={16} />
            <span className="text-xl font-semibold">{displayTotalPoints}</span>
          </div>
          <p className="text-xs text-text-muted">Points</p>
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-accent mb-1">
            <Award size={16} />
            <span className="text-xl font-semibold">{displayTotalAwards}</span>
          </div>
          <p className="text-xs text-text-muted">Awards</p>
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-accent-success mb-1">
            <Clock size={16} />
            <span className="text-xl font-semibold">{displayAttendanceLabel}h</span>
          </div>
          <p className="text-xs text-text-muted">Hours</p>
        </div>
      </div>

      {/* Champion Callouts */}
      {doubleChampionId && topPointsName ? (
        <div className="flex items-center gap-2 px-4 py-3 bg-accent-success/10 border border-accent-success/30 rounded-xl">
          <Sparkles size={16} className="text-accent-success shrink-0" />
          <span className="text-sm text-text-primary">
            <span className="font-medium">{topPointsName}</span>
            <span className="text-text-muted"> leads both points and hours!</span>
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {topPointsName && (
            <div className="flex items-center gap-2 px-3 py-2 bg-accent-orange/10 border border-accent-orange/30 rounded-lg">
              <Crown size={14} className="text-accent-orange" />
              <span className="text-sm">
                <span className="text-text-muted">Top points:</span>{' '}
                <span className="font-medium text-text-primary">{topPointsName}</span>
              </span>
            </div>
          )}
          {topHoursName && topHoursName !== topPointsName && (
            <div className="flex items-center gap-2 px-3 py-2 bg-accent-success/10 border border-accent-success/30 rounded-lg">
              <Clock size={14} className="text-accent-success" />
              <span className="text-sm">
                <span className="text-text-muted">Top hours:</span>{' '}
                <span className="font-medium text-text-primary">{topHoursName}</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
