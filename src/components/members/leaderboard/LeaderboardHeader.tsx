import React from 'react';
import clsx from 'clsx';
import { Trophy, Timer, Sparkles } from 'lucide-react';
import { LeaderboardRange } from '../types';

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
  { value: 'allTime', label: 'All time' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'lastWeek', label: 'Last Week' },
];

const rangeLabelMap: Record<LeaderboardRange, string> = {
  allTime: 'All time',
  lastMonth: 'Last 30 days',
  lastWeek: 'Last 7 days',
};

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
  const selectedRangeLabel = rangeLabelMap[leaderboardRange];

  return (
    <div className="relative overflow-hidden glass-panel p-6">
      <div className="absolute inset-0 pointer-events-none opacity-60">
        <div className="absolute -top-24 right-0 h-40 w-40 rounded-full bg-gradient-to-br from-sunset-orange/50 via-amber-200/30 to-transparent blur-3xl" />
        <div className="absolute -bottom-28 left-0 h-48 w-48 rounded-full bg-gradient-to-br from-accent-purple/40 via-indigo-400/30 to-transparent blur-3xl" />
      </div>
      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-text-primary">
            <Trophy size={22} className="text-sunset-orange drop-shadow" />
            <h2 className="text-2xl font-light">μpoint leaderboard</h2>
          </div>
          <p className="text-sm text-text-muted mt-2">
            {canAwardPoints
              ? 'tap a teammate to celebrate them with μpoints and peek at their highlight reel.'
              : 'tap a teammate to explore their μpoint highlight reel.'}
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-4 sm:items-end">
          <div className="inline-flex items-center justify-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 text-xs">
            {rangeOptions.map((option) => {
              const isSelected = option.value === leaderboardRange;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => !isSelected && onSelectRange(option.value)}
                  className={clsx(
                    'px-3 py-1 rounded-full transition-colors touch-feedback',
                    isSelected
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-text-muted hover:text-text-primary'
                  )}
                  aria-pressed={isSelected}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-light text-sunset-orange">{displayTotalPoints}</p>
              <p className="text-xs text-text-dim uppercase tracking-widest">
                μpoints awarded • {selectedRangeLabel}
              </p>
            </div>
            <div>
              <p className="text-2xl font-light text-accent-purple">{displayTotalAwards}</p>
              <p className="text-xs text-text-dim uppercase tracking-widest">
                recognitions logged • {selectedRangeLabel}
              </p>
            </div>
            <div>
              <p className="text-2xl font-light text-emerald-300">{displayAttendanceLabel}</p>
              <p className="text-xs text-text-dim uppercase tracking-widest">
                hours tracked • {selectedRangeLabel}
              </p>
            </div>
          </div>
        </div>
      </div>

      {doubleChampionId && topPointsName ? (
        <div className="relative z-10 mt-4 inline-flex items-center gap-2 rounded-2xl border border-emerald-300/40 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-100 shadow-[0_10px_25px_rgba(16,185,129,0.12)]">
          <Sparkles size={16} className="text-emerald-200" />
          <span>
            double crown: <span className="text-text-primary">{topPointsName}</span> leads μpoints & hours!
          </span>
        </div>
      ) : (
        <>
          {topPointsName && (
            <div className="relative z-10 mt-4 text-sm text-text-muted">
              🏆 leading the charge: <span className="text-text-primary">{topPointsName}</span>
            </div>
          )}
          {topHoursName && (
            <div className="relative z-10 mt-2 text-sm text-text-muted flex items-center gap-2">
              <Timer size={16} className="text-emerald-300" />
              <span>
                hours hero: <span className="text-text-primary">{topHoursName}</span>
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
