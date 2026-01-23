import { useMemo, useState } from "react";
import { type Id } from "../../../convex/_generated/dataModel";
import { MemberWithProfile } from "../../lib/members";
import { LeaderboardEntry } from "./types";
import { ProfileAvatar } from "../ProfileAvatar";
import { SearchInput, Select, Badge, Card, Button } from "../ui";
import { cn } from "../../lib/utils";
import {
  Trophy,
  Clock,
  Mail,
  ChevronRight,
  Users,
  Crown,
  Medal,
  Award,
  Filter,
  Grid3X3,
  List,
} from "lucide-react";

export interface TeamTabProps {
  members: MemberWithProfile[];
  leaderboard: LeaderboardEntry[];
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  currentMemberId: Id<"members">;
  onSelectMember: (memberId: Id<"members">) => void;
  formatPoints: (value: number) => string;
  formatHours: (valueMs: number) => string;
}

const roleOptions = [
  { value: "all", label: "All Roles" },
  { value: "admin", label: "Admins" },
  { value: "lead", label: "Leads" },
  { value: "member", label: "Members" },
];

const sortOptions = [
  { value: "name", label: "Name" },
  { value: "points", label: "Points" },
  { value: "hours", label: "Hours" },
  { value: "recent", label: "Recently Joined" },
];

export function TeamTab({
  members,
  leaderboard,
  searchTerm,
  onSearchTermChange,
  roleFilter,
  onRoleFilterChange,
  currentMemberId,
  onSelectMember,
  formatPoints,
  formatHours,
}: TeamTabProps) {
  const [sortBy, setSortBy] = useState("points");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Create a map of member stats from leaderboard
  const memberStats = useMemo(() => {
    const map = new Map<
      Id<"members">,
      { points: number; hours: number; rank: number; hoursRank: number }
    >();

    // Sort by points for point rank
    const sortedByPoints = [...leaderboard].sort((a, b) => b.totalPoints - a.totalPoints);
    sortedByPoints.forEach((entry, index) => {
      map.set(entry.memberId, {
        points: entry.totalPoints,
        hours: entry.totalAttendanceMs,
        rank: index + 1,
        hoursRank: 0,
      });
    });

    // Sort by hours for hours rank
    const sortedByHours = [...leaderboard].sort((a, b) => b.totalAttendanceMs - a.totalAttendanceMs);
    sortedByHours.forEach((entry, index) => {
      const existing = map.get(entry.memberId);
      if (existing) {
        existing.hoursRank = index + 1;
      }
    });

    return map;
  }, [leaderboard]);

  // Filter and sort members
  const filteredMembers = useMemo(() => {
    let result = [...members];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(term) ||
          m.email.toLowerCase().includes(term)
      );
    }

    // Filter by role
    if (roleFilter !== "all") {
      result = result.filter((m) => m.role === roleFilter);
    }

    // Sort
    result.sort((a, b) => {
      const statsA = memberStats.get(a._id);
      const statsB = memberStats.get(b._id);

      switch (sortBy) {
        case "points":
          return (statsB?.points ?? 0) - (statsA?.points ?? 0);
        case "hours":
          return (statsB?.hours ?? 0) - (statsA?.hours ?? 0);
        case "recent":
          return b.joinedAt - a.joinedAt;
        case "name":
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return result;
  }, [members, searchTerm, roleFilter, sortBy, memberStats]);

  const roleStats = useMemo(
    () => ({
      admin: members.filter((m) => m.role === "admin").length,
      lead: members.filter((m) => m.role === "lead").length,
      member: members.filter((m) => m.role === "member").length,
    }),
    [members]
  );

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { icon: Crown, color: "text-accent-orange", bg: "bg-accent-orange/10" };
    if (rank === 2) return { icon: Medal, color: "text-zinc-300", bg: "bg-zinc-500/10" };
    if (rank === 3) return { icon: Award, color: "text-amber-600", bg: "bg-amber-600/10" };
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Search, Filter & View Controls */}
      <div className="bg-bg-secondary border border-border rounded-xl p-4">
        <div className="flex flex-col gap-3">
          {/* Search */}
          <SearchInput
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            onClear={() => onSearchTermChange("")}
          />

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={roleFilter}
              onChange={(e) => onRoleFilterChange(e.target.value)}
              options={roleOptions}
              className="w-32"
            />
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              options={sortOptions}
              className="w-36"
            />
            <div className="flex-1" />
            <div className="flex rounded-lg border border-border overflow-hidden bg-bg-tertiary">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-2 transition-colors",
                  viewMode === "grid"
                    ? "bg-accent text-white"
                    : "text-text-muted hover:text-text-primary"
                )}
              >
                <Grid3X3 size={16} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-2 transition-colors",
                  viewMode === "list"
                    ? "bg-accent text-white"
                    : "text-text-muted hover:text-text-primary"
                )}
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-4 mt-4 pt-4 border-t border-border-subtle">
          <div className="flex items-center gap-2 text-sm">
            <Users size={14} className="text-text-muted" />
            <span className="text-text-muted">{members.length} members</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="error" size="sm">{roleStats.admin} admin{roleStats.admin !== 1 ? "s" : ""}</Badge>
            <Badge variant="warning" size="sm">{roleStats.lead} lead{roleStats.lead !== 1 ? "s" : ""}</Badge>
            <Badge variant="default" size="sm">{roleStats.member} member{roleStats.member !== 1 ? "s" : ""}</Badge>
          </div>
        </div>
      </div>

      {/* Members Grid/List */}
      {filteredMembers.length === 0 ? (
        <div className="bg-bg-secondary border border-border rounded-xl p-12 text-center">
          <Users size={32} className="text-text-muted mx-auto mb-3" />
          <p className="text-text-muted">
            {searchTerm || roleFilter !== "all"
              ? "No members found matching your criteria"
              : "No members found"}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredMembers.map((teamMember) => {
            const stats = memberStats.get(teamMember._id);
            const rankBadge = stats ? getRankBadge(stats.rank) : null;
            const isYou = teamMember._id === currentMemberId;

            return (
              <button
                key={teamMember._id}
                onClick={() => onSelectMember(teamMember._id)}
                className={cn(
                  "text-left p-4 rounded-xl border transition-all duration-200",
                  "bg-bg-secondary border-border hover:border-accent/50 hover:bg-bg-tertiary",
                  "active:scale-[0.98]",
                  isYou && "ring-1 ring-accent/30"
                )}
              >
                {/* Header with avatar and role */}
                <div className="flex items-start gap-3 mb-3">
                  <ProfileAvatar
                    name={teamMember.name}
                    imageUrl={teamMember.profileImageUrl}
                    size="lg"
                    className={cn(
                      "shrink-0",
                      rankBadge && "ring-2",
                      stats?.rank === 1 && "ring-accent-orange/50",
                      stats?.rank === 2 && "ring-zinc-400/50",
                      stats?.rank === 3 && "ring-amber-600/50"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-text-primary truncate">
                        {teamMember.name}
                      </h4>
                      {isYou && (
                        <Badge variant="accent" size="sm">You</Badge>
                      )}
                    </div>
                    <Badge
                      variant={
                        teamMember.role === "admin"
                          ? "error"
                          : teamMember.role === "lead"
                          ? "warning"
                          : "default"
                      }
                      size="sm"
                      className="mt-1"
                    >
                      {teamMember.role}
                    </Badge>
                  </div>
                  {rankBadge && (
                    <div className={cn("p-1.5 rounded-lg", rankBadge.bg)}>
                      <rankBadge.icon size={14} className={rankBadge.color} />
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Trophy size={14} className="text-accent-orange" />
                    <span className="text-text-secondary">
                      {formatPoints(stats?.points ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-accent-success" />
                    <span className="text-text-secondary">
                      {formatHours(stats?.hours ?? 0)}h
                    </span>
                  </div>
                  {stats && stats.rank <= 10 && (
                    <span className="text-xs text-text-muted ml-auto">
                      #{stats.rank}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden divide-y divide-border-subtle">
          {filteredMembers.map((teamMember) => {
            const stats = memberStats.get(teamMember._id);
            const rankBadge = stats ? getRankBadge(stats.rank) : null;
            const isYou = teamMember._id === currentMemberId;

            return (
              <button
                key={teamMember._id}
                onClick={() => onSelectMember(teamMember._id)}
                className="w-full flex items-center gap-4 p-4 hover:bg-bg-hover transition-colors text-left"
              >
                <ProfileAvatar
                  name={teamMember.name}
                  imageUrl={teamMember.profileImageUrl}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-text-primary truncate">
                      {teamMember.name}
                    </h4>
                    {isYou && (
                      <Badge variant="accent" size="sm">You</Badge>
                    )}
                    <Badge
                      variant={
                        teamMember.role === "admin"
                          ? "error"
                          : teamMember.role === "lead"
                          ? "warning"
                          : "default"
                      }
                      size="sm"
                    >
                      {teamMember.role}
                    </Badge>
                  </div>
                  <p className="text-sm text-text-muted truncate">
                    {teamMember.email}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <Trophy size={14} className="text-accent-orange" />
                      <span className="text-sm font-medium text-text-primary">
                        {formatPoints(stats?.points ?? 0)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-end mt-0.5">
                      <Clock size={14} className="text-accent-success" />
                      <span className="text-sm text-text-muted">
                        {formatHours(stats?.hours ?? 0)}h
                      </span>
                    </div>
                  </div>
                  {rankBadge && (
                    <div className={cn("p-2 rounded-lg", rankBadge.bg)}>
                      <rankBadge.icon size={16} className={rankBadge.color} />
                    </div>
                  )}
                  <ChevronRight size={16} className="text-text-muted" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
