import React from 'react';
import clsx from 'clsx';
import { Crown, Trophy, Timer, Sparkles } from 'lucide-react';
import { ProfileAvatar } from '../../ProfileAvatar';
import { LeaderboardEntry } from '../types';

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

function getSpotlightBackground(index: number) {
  switch (index) {
    case 0:
      return 'bg-gradient-to-br from-[#f97316] via-[#facc15] to-[#f43f5e]';
    case 1:
      return 'bg-gradient-to-br from-white/80 via-white/40 to-transparent';
    case 2:
      return 'bg-gradient-to-br from-[#a855f7]/70 via-[#6366f1]/60 to-transparent';
    default:
      return 'bg-gradient-to-br from-white/10 to-transparent';
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
  const backgroundClass = getSpotlightBackground(index);
  const avatarClassName = clsx(
    'border-2 border-white/50',
    index === 0 && 'border-amber-200/80 shadow-[0_0_28px_rgba(251,191,36,0.35)]',
    index === 1 && 'border-white/60 shadow-[0_0_22px_rgba(148,163,184,0.35)]',
    index === 2 && 'border-sunset-orange/70 shadow-[0_0_22px_rgba(251,146,60,0.35)]',
    isHoursHero && !isDoubleChampion && 'border-accent-purple/70 shadow-[0_0_28px_rgba(129,140,248,0.35)]',
    isDoubleChampion && 'border-emerald-200/80 shadow-[0_0_38px_rgba(16,185,129,0.45)]'
  );

  const attendanceSummary =
    entry.totalAttendanceMs > 0
      ? `${formatHours(entry.totalAttendanceMs)} hours • ${entry.attendanceMeetingsCount.toLocaleString()} ${
          entry.attendanceMeetingsCount === 1 ? 'meeting' : 'meetings'
        } • ${entry.attendanceSessionCount.toLocaleString()} ${
          entry.attendanceSessionCount === 1 ? 'check-in' : 'check-ins'
        }`
      : 'no hours tracked yet';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'relative overflow-hidden rounded-3xl border border-white/15 p-6 text-left transition-transform hover:-translate-y-1 touch-feedback',
        isDoubleChampion && 'border-emerald-200/70 shadow-[0_22px_48px_rgba(16,185,129,0.35)]'
      )}
    >
      {isDoubleChampion && (
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 via-transparent to-emerald-500/20" />
      )}
      <div className={clsx('absolute inset-0 opacity-80', backgroundClass)} />
      <div className="relative z-10 flex flex-col h-full justify-between gap-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <ProfileAvatar
              name={entry.name}
              imageUrl={entry.profileImageUrl}
              size="xl"
              className={avatarClassName}
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xl font-light">{entry.name}</h4>
                <span className="badge bg-black/40 border-white/20 text-white">#{index + 1}</span>
                {isYou && (
                  <span className="text-xs bg-white/30 text-white px-2 py-0.5 rounded-full">you</span>
                )}
                {isDoubleChampion ? (
                  <span className="text-[11px] uppercase tracking-widest bg-emerald-300/30 text-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200/60 flex items-center gap-1">
                    <Sparkles size={14} className="text-emerald-200" />
                    double crown
                  </span>
                ) : (
                  isHoursHero && (
                    <span className="text-[11px] uppercase tracking-widest bg-indigo-300/25 text-white px-2 py-0.5 rounded-full border border-white/30 flex items-center gap-1">
                      <Timer size={14} className="text-white" />
                      hours hero
                    </span>
                  )
                )}
              </div>
              <p className="text-sm text-white/70 mt-1">{entry.email}</p>
              <p className="text-xs text-white/60 mt-2">
                {entry.awardsCount === 0
                  ? 'no μpoints yet'
                  : `${entry.awardsCount.toLocaleString()} ${
                      entry.awardsCount === 1 ? 'award' : 'awards'
                    } • last awarded ${formatAwardDate(entry.lastAwardedAt)}`}
              </p>
              <p className="text-xs text-white/60 mt-2 flex items-center gap-1">
                <Timer size={16} className="text-emerald-200" />
                {attendanceSummary}
              </p>
            </div>
          </div>
          {index === 0 ? (
            <Crown size={32} className="text-amber-200 drop-shadow-lg" />
          ) : (
            <Trophy size={28} className="text-white/80" />
          )}
        </div>
        <div>
          <p className="text-4xl font-light drop-shadow-lg">+{formatPoints(entry.totalPoints)}</p>
          <p className="text-xs uppercase tracking-widest text-white/70 mt-1">total μpoints</p>
        </div>
      </div>
    </button>
  );
}
