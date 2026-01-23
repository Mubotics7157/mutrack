import React from 'react';
import clsx from 'clsx';
import { Timer, Sparkles } from 'lucide-react';
import { ProfileAvatar } from '../../ProfileAvatar';
import { LeaderboardEntry } from '../types';
import { type Id } from '../../../../convex/_generated/dataModel';

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
    ? Math.min(100, Math.max(6, Math.round((entry.totalPoints / leaderPoints) * 100)))
    : 0;
  const progressWidth = `${progressRaw}%`;
  const attendanceHoursLabel = formatHours(entry.totalAttendanceMs);
  const meetingsLabel = entry.attendanceMeetingsCount === 1 ? 'meeting' : 'meetings';
  const sessionsLabel = entry.attendanceSessionCount === 1 ? 'check-in' : 'check-ins';
  const attendanceSummary =
    entry.totalAttendanceMs > 0
      ? `${attendanceHoursLabel} hours • ${entry.attendanceMeetingsCount.toLocaleString()} ${meetingsLabel} • ${entry.attendanceSessionCount.toLocaleString()} ${sessionsLabel}`
      : 'no hours tracked yet';

  return (
    <button type="button" onClick={onSelect} className="w-full text-left">
      <div
        className={clsx(
          'card-modern hover:-translate-y-1 transition-transform',
          isDoubleChampion && 'border-emerald-300/50 shadow-[0_12px_32px_rgba(16,185,129,0.22)]'
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-glass via-white/10 to-transparent border border-white/10 flex items-center justify-center text-sm font-semibold text-text-secondary">
                #{rank}
              </div>
              <ProfileAvatar
                name={entry.name}
                imageUrl={entry.profileImageUrl}
                size="lg"
                className={clsx(
                  'border border-white/20',
                  isHoursHero && 'border-accent-purple/50 shadow-[0_0_18px_rgba(129,140,248,0.35)]',
                  isDoubleChampion && 'border-emerald-300/70 shadow-[0_0_22px_rgba(16,185,129,0.35)]'
                )}
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap text-text-primary">
                <h4 className="font-light text-lg">{entry.name}</h4>
                {isYou && (
                  <span className="text-xs text-sunset-orange bg-sunset-orange-dim px-2 py-0.5 rounded-full">
                    you
                  </span>
                )}
                {isDoubleChampion ? (
                  <span className="text-[11px] uppercase tracking-widest bg-emerald-400/15 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-300/50 flex items-center gap-1">
                    <Sparkles size={12} className="text-emerald-200" />
                    double crown
                  </span>
                ) : (
                  isHoursHero && (
                    <span className="text-[11px] uppercase tracking-widest bg-accent-purple/15 text-accent-purple px-2 py-0.5 rounded-full border border-accent-purple/40 flex items-center gap-1">
                      <Timer size={12} className="text-accent-purple" />
                      hours hero
                    </span>
                  )
                )}
              </div>
              <p className="text-sm text-text-muted">{entry.email}</p>
              <p className="text-xs text-text-dim mt-1">
                {entry.awardsCount === 0
                  ? 'no μpoints yet'
                  : `${entry.awardsCount.toLocaleString()} ${
                      entry.awardsCount === 1 ? 'award' : 'awards'
                    } • last awarded ${formatAwardDate(entry.lastAwardedAt)}`}
              </p>
              <p className="text-xs text-text-dim mt-2 flex items-center gap-1">
                <Timer size={14} className="text-emerald-300" />
                {attendanceSummary}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-light text-sunset-orange">+{formatPoints(entry.totalPoints)}</p>
            <p className="text-xs text-text-dim uppercase tracking-widest mt-1">total μpoints</p>
          </div>
        </div>
        <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sunset-orange via-amber-400 to-accent-purple"
            style={{ width: progressWidth }}
          />
        </div>
      </div>
    </button>
  );
}
