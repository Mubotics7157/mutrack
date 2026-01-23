import React from 'react';
import clsx from 'clsx';
import { Timer, Sparkles, Trophy } from 'lucide-react';
import { ProfileAvatar } from '../../ProfileAvatar';
import { LeaderboardEntry } from '../types';
import { type Id } from '../../../../convex/_generated/dataModel';

interface AttendanceLeaderboardProps {
  entries: LeaderboardEntry[];
  formatHours: (valueMs: number) => string;
  onSelectMember: (memberId: Id<'members'>) => void;
  currentMemberId: Id<'members'>;
  doubleChampionId: Id<'members'> | null;
  pointsRoyaltyIds: Set<Id<'members'>>;
}

const rankTitles = ['time titan', 'momentum maker', 'clockwork ace'];

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
    <div className="relative overflow-hidden glass-panel mt-6 p-6">
      <div className="absolute inset-0 pointer-events-none opacity-60">
        <div className="absolute -top-24 left-0 h-40 w-40 rounded-full bg-gradient-to-br from-emerald-400/40 via-emerald-300/20 to-transparent blur-3xl" />
        <div className="absolute -bottom-24 right-0 h-48 w-48 rounded-full bg-gradient-to-br from-accent-purple/40 via-indigo-400/30 to-transparent blur-3xl" />
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-2 text-text-primary">
          <Timer size={22} className="text-emerald-300" />
          <h3 className="text-2xl font-light">attendance hours leaderboard</h3>
        </div>
        <p className="text-sm text-text-muted mt-2">celebrating the time invested at meetings.</p>

        {entries.length === 0 ? (
          <div className="mt-6 text-sm text-text-muted">
            no attendance sessions recorded yet. once meetings are logged, this board will glow to honor our timekeepers.
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {entries.map((entry, index) => {
              const rank = index + 1;
              const progressRaw = leaderMs
                ? Math.min(100, Math.max(8, Math.round((entry.totalAttendanceMs / leaderMs) * 100)))
                : 0;
              const progressWidth = `${progressRaw}%`;
              const isYou = entry.memberId === currentMemberId;
              const isDoubleChampion = doubleChampionId === entry.memberId;
              const isPointsRoyalty = pointsRoyaltyIds.has(entry.memberId);
              const hoursLabel = formatHours(entry.totalAttendanceMs);
              const meetingsLabel = entry.attendanceMeetingsCount === 1 ? 'meeting' : 'meetings';
              const sessionsLabel = entry.attendanceSessionCount === 1 ? 'check-in' : 'check-ins';
              const rankTitle = rankTitles[index] ?? null;

              return (
                <button
                  key={entry.memberId}
                  type="button"
                  onClick={() => onSelectMember(entry.memberId)}
                  className="w-full text-left"
                >
                  <div
                    className={clsx(
                      'card-modern hover:-translate-y-1 transition-transform bg-gradient-to-br from-emerald-500/5 via-transparent to-indigo-500/10',
                      isDoubleChampion && 'border-emerald-300/50 shadow-[0_12px_36px_rgba(16,185,129,0.25)]'
                    )}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-transparent to-emerald-300/10 border border-emerald-400/30 flex items-center justify-center text-sm font-semibold text-emerald-100">
                            #{rank}
                          </div>
                          <ProfileAvatar
                            name={entry.name}
                            imageUrl={entry.profileImageUrl}
                            size="lg"
                            className={clsx(
                              'border border-white/20',
                              isDoubleChampion && 'border-emerald-300/70 shadow-[0_0_24px_rgba(16,185,129,0.45)]',
                              !isDoubleChampion && 'border-accent-purple/40 shadow-[0_0_18px_rgba(129,140,248,0.28)]'
                            )}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap text-text-primary">
                            <h4 className="font-light text-lg text-text-primary">{entry.name}</h4>
                            {rankTitle && (
                              <span className="text-[11px] uppercase tracking-widest bg-emerald-400/20 text-emerald-200 px-2 py-0.5 rounded-full">
                                {rankTitle}
                              </span>
                            )}
                            {isYou && (
                              <span className="text-xs text-emerald-200 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                                you
                              </span>
                            )}
                            {isDoubleChampion ? (
                              <span className="text-[11px] uppercase tracking-widest bg-emerald-300/25 text-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200/50 flex items-center gap-1">
                                <Sparkles size={12} className="text-emerald-200" />
                                double crown
                              </span>
                            ) : (
                              isPointsRoyalty && (
                                <span className="text-[11px] uppercase tracking-widest bg-accent-purple/20 text-accent-purple px-2 py-0.5 rounded-full border border-accent-purple/40 flex items-center gap-1">
                                  <Trophy size={12} className="text-accent-purple" />
                                  μpoint royalty
                                </span>
                              )
                            )}
                          </div>
                          <p className="text-sm text-text-muted">{entry.email}</p>
                          <p className="text-xs text-text-dim mt-1 flex items-center gap-1">
                            <Timer size={14} className="text-emerald-300" />
                            {hoursLabel} hours logged
                          </p>
                          <p className="text-xs text-text-dim mt-1">
                            {entry.attendanceMeetingsCount.toLocaleString()} {meetingsLabel} •{' '}
                            {entry.attendanceSessionCount.toLocaleString()} {sessionsLabel}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-light text-emerald-200">{hoursLabel}h</p>
                        <p className="text-xs text-text-dim uppercase tracking-widest mt-1">attendance hours</p>
                      </div>
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-300 via-indigo-400 to-accent-purple"
                        style={{ width: progressWidth }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
