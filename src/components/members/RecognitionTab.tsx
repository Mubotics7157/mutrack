import { useMemo, useState } from "react";
import { type Id } from "../../../convex/_generated/dataModel";
import { LeaderboardEntry, LeaderboardRange } from "./types";
import { ProfileAvatar } from "../ProfileAvatar";
import { Badge } from "../ui";
import { cn } from "../../lib/utils";
import {
  Trophy,
  Clock,
  Crown,
  Medal,
  Award,
  Sparkles,
  TrendingUp,
  ChevronRight,
} from "lucide-react";

export interface RecognitionTabProps {
  leaderboard: LeaderboardEntry[];
  leaderboardRange: LeaderboardRange;
  onSelectRange: (range: LeaderboardRange) => void;
  onSelectMember: (memberId: Id<"members">) => void;
  currentMemberId: Id<"members">;
  isLoading: boolean;
  formatPoints: (value: number) => string;
  formatHours: (valueMs: number) => string;
  canAwardPoints: boolean;
}

type ViewMode = "points" | "hours";

const rangeOptions: { value: LeaderboardRange; label: string }[] = [
  { value: "allTime", label: "All Time" },
  { value: "lastMonth", label: "Month" },
  { value: "lastWeek", label: "Week" },
];

export function RecognitionTab({
  leaderboard,
  leaderboardRange,
  onSelectRange,
  onSelectMember,
  currentMemberId,
  isLoading,
  formatPoints,
  formatHours,
  canAwardPoints,
}: RecognitionTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("points");

  // Sort by selected metric
  const sortedLeaderboard = useMemo(() => {
    if (viewMode === "hours") {
      return [...leaderboard].sort((a, b) => {
        if (b.totalAttendanceMs !== a.totalAttendanceMs) {
          return b.totalAttendanceMs - a.totalAttendanceMs;
        }
        return b.totalPoints - a.totalPoints;
      });
    }
    return leaderboard;
  }, [leaderboard, viewMode]);

  const topThree = sortedLeaderboard.slice(0, 3);
  const rest = sortedLeaderboard.slice(3);

  // Stats
  const stats = useMemo(() => {
    const totalPoints = leaderboard.reduce((sum, e) => sum + e.totalPoints, 0);
    const totalHours = leaderboard.reduce((sum, e) => sum + e.totalAttendanceMs, 0);
    const totalAwards = leaderboard.reduce((sum, e) => sum + e.awardsCount, 0);
    return { totalPoints, totalHours, totalAwards };
  }, [leaderboard]);

  // Find current user's rank
  const myRank = useMemo(() => {
    const index = sortedLeaderboard.findIndex((e) => e.memberId === currentMemberId);
    return index >= 0 ? index + 1 : null;
  }, [sortedLeaderboard, currentMemberId]);

  const myEntry = sortedLeaderboard.find((e) => e.memberId === currentMemberId);

  const getMetricValue = (entry: LeaderboardEntry) => {
    if (viewMode === "hours") {
      return `${formatHours(entry.totalAttendanceMs)}h`;
    }
    return formatPoints(entry.totalPoints);
  };

  const leaderValue = topThree[0]
    ? viewMode === "hours"
      ? topThree[0].totalAttendanceMs
      : topThree[0].totalPoints
    : 1;

  const getProgress = (entry: LeaderboardEntry) => {
    const value = viewMode === "hours" ? entry.totalAttendanceMs : entry.totalPoints;
    return Math.max(4, Math.round((value / leaderValue) * 100));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="bg-bg-secondary border border-border rounded-xl p-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-bg-tertiary rounded w-48 mx-auto" />
            <div className="h-4 bg-bg-tertiary rounded w-64 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="bg-bg-secondary border border-border rounded-xl p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto mb-4">
          <Trophy size={32} className="text-text-muted" />
        </div>
        <h3 className="text-lg font-medium text-text-primary mb-2">
          No rankings yet
        </h3>
        <p className="text-sm text-text-muted">
          Once points are awarded, the leaderboard will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* View Mode Toggle */}
        <div className="flex rounded-lg border border-border overflow-hidden bg-bg-tertiary">
          <button
            onClick={() => setViewMode("points")}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2",
              viewMode === "points"
                ? "bg-accent-orange text-white"
                : "text-text-muted hover:text-text-primary"
            )}
          >
            <Trophy size={14} />
            Points
          </button>
          <button
            onClick={() => setViewMode("hours")}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2",
              viewMode === "hours"
                ? "bg-accent-success text-white"
                : "text-text-muted hover:text-text-primary"
            )}
          >
            <Clock size={14} />
            Hours
          </button>
        </div>

        {/* Range Selector */}
        <div className="flex rounded-lg border border-border overflow-hidden bg-bg-tertiary">
          {rangeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onSelectRange(option.value)}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                option.value === leaderboardRange
                  ? "bg-accent text-white"
                  : "text-text-muted hover:text-text-primary"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Your Rank Card (if not in top 3) */}
      {myRank && myRank > 3 && myEntry && (
        <button
          onClick={() => onSelectMember(currentMemberId)}
          className="w-full bg-accent/10 border border-accent/30 rounded-xl p-4 text-left hover:bg-accent/20 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center text-accent font-semibold">
              #{myRank}
            </div>
            <ProfileAvatar
              name={myEntry.name}
              imageUrl={myEntry.profileImageUrl}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-text-primary">{myEntry.name}</span>
                <Badge variant="accent" size="sm">You</Badge>
              </div>
              <p className="text-sm text-text-muted">
                {viewMode === "points"
                  ? `${formatPoints(myEntry.totalPoints)} points`
                  : `${formatHours(myEntry.totalAttendanceMs)} hours`}
              </p>
            </div>
            <ChevronRight size={16} className="text-accent" />
          </div>
        </button>
      )}

      {/* Podium - Top 3 */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {/* Second Place */}
          {topThree[1] && (
            <PodiumCard
              entry={topThree[1]}
              rank={2}
              viewMode={viewMode}
              formatValue={getMetricValue}
              isYou={topThree[1].memberId === currentMemberId}
              onSelect={() => onSelectMember(topThree[1].memberId)}
              className="mt-4"
            />
          )}

          {/* First Place */}
          {topThree[0] && (
            <PodiumCard
              entry={topThree[0]}
              rank={1}
              viewMode={viewMode}
              formatValue={getMetricValue}
              isYou={topThree[0].memberId === currentMemberId}
              onSelect={() => onSelectMember(topThree[0].memberId)}
            />
          )}

          {/* Third Place */}
          {topThree[2] && (
            <PodiumCard
              entry={topThree[2]}
              rank={3}
              viewMode={viewMode}
              formatValue={getMetricValue}
              isYou={topThree[2].memberId === currentMemberId}
              onSelect={() => onSelectMember(topThree[2].memberId)}
              className="mt-6"
            />
          )}
        </div>
      )}

      {/* Rest of Leaderboard */}
      {rest.length > 0 && (
        <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
          <div className="divide-y divide-border-subtle">
            {rest.map((entry, index) => {
              const rank = index + 4;
              const isYou = entry.memberId === currentMemberId;
              const progress = getProgress(entry);

              return (
                <button
                  key={entry.memberId}
                  onClick={() => onSelectMember(entry.memberId)}
                  className={cn(
                    "w-full text-left p-4 transition-colors hover:bg-bg-tertiary flex items-center gap-4",
                    isYou && "bg-accent/5"
                  )}
                >
                  {/* Rank */}
                  <div className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center text-sm font-medium text-text-muted shrink-0">
                    {rank}
                  </div>

                  {/* Avatar */}
                  <ProfileAvatar
                    name={entry.name}
                    imageUrl={entry.profileImageUrl}
                    size="sm"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary truncate">
                        {entry.name}
                      </span>
                      {isYou && <Badge variant="accent" size="sm">You</Badge>}
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-2 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          viewMode === "points" ? "bg-accent-orange" : "bg-accent-success"
                        )}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Value */}
                  <div className="text-right shrink-0">
                    <span
                      className={cn(
                        "text-lg font-semibold",
                        viewMode === "points" ? "text-accent-orange" : "text-accent-success"
                      )}
                    >
                      {getMetricValue(entry)}
                    </span>
                  </div>

                  <ChevronRight size={16} className="text-text-muted shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats Footer */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-bg-secondary border border-border rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-accent-orange mb-1">
            <Trophy size={16} />
            <span className="text-xl font-semibold">{formatPoints(stats.totalPoints)}</span>
          </div>
          <p className="text-xs text-text-muted">Total Points</p>
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-accent-success mb-1">
            <Clock size={16} />
            <span className="text-xl font-semibold">{formatHours(stats.totalHours)}h</span>
          </div>
          <p className="text-xs text-text-muted">Total Hours</p>
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-accent mb-1">
            <Award size={16} />
            <span className="text-xl font-semibold">{stats.totalAwards}</span>
          </div>
          <p className="text-xs text-text-muted">Awards Given</p>
        </div>
      </div>

      {canAwardPoints && (
        <p className="text-xs text-text-muted text-center">
          Tap any member to view their history or award points
        </p>
      )}
    </div>
  );
}

// Podium Card Component
interface PodiumCardProps {
  entry: LeaderboardEntry;
  rank: 1 | 2 | 3;
  viewMode: ViewMode;
  formatValue: (entry: LeaderboardEntry) => string;
  isYou: boolean;
  onSelect: () => void;
  className?: string;
}

function PodiumCard({
  entry,
  rank,
  viewMode,
  formatValue,
  isYou,
  onSelect,
  className,
}: PodiumCardProps) {
  const config = {
    1: {
      icon: Crown,
      color: "text-accent-orange",
      bg: "bg-accent-orange/10",
      border: "border-accent-orange/30",
      ring: "ring-accent-orange/50",
    },
    2: {
      icon: Medal,
      color: "text-zinc-300",
      bg: "bg-zinc-500/10",
      border: "border-zinc-400/30",
      ring: "ring-zinc-400/50",
    },
    3: {
      icon: Award,
      color: "text-amber-600",
      bg: "bg-amber-600/10",
      border: "border-amber-600/30",
      ring: "ring-amber-600/50",
    },
  }[rank];

  const IconComponent = config.icon;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex flex-col items-center p-4 rounded-xl border transition-all",
        "hover:scale-[1.02] active:scale-[0.98]",
        config.bg,
        config.border,
        className
      )}
    >
      {/* Rank Icon */}
      <div className={cn("mb-2", config.color)}>
        <IconComponent size={rank === 1 ? 28 : 24} />
      </div>

      {/* Avatar */}
      <ProfileAvatar
        name={entry.name}
        imageUrl={entry.profileImageUrl}
        size={rank === 1 ? "lg" : "md"}
        className={cn("ring-2 mb-2", config.ring)}
      />

      {/* Name */}
      <div className="flex items-center gap-1 mb-1">
        <span className="font-medium text-text-primary text-sm truncate max-w-[80px]">
          {entry.name.split(" ")[0]}
        </span>
        {isYou && (
          <span className="text-[10px] text-accent bg-accent/10 px-1 rounded">
            You
          </span>
        )}
      </div>

      {/* Value */}
      <span
        className={cn(
          "text-lg font-semibold",
          viewMode === "points" ? "text-accent-orange" : "text-accent-success"
        )}
      >
        {formatValue(entry)}
      </span>
    </button>
  );
}
