import { useEffect, useMemo, useState, type FormEvent } from "react";
import clsx from "clsx";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { type Doc, type Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import {
  AlertTriangle,
  Trash2,
  Trophy,
  PlusCircle,
  Users,
  ShieldCheck,
  Sparkles,
  Crown,
  Medal,
  Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Modal } from "./Modal";

type Role = Doc<"members">["role"];
type RoleFilter = "all" | Role;
type MembersTab = "leaderboard" | "directory" | "management";

interface LeaderboardEntry {
  memberId: Id<"members">;
  name: string;
  email: string;
  role: Role;
  totalPoints: number;
  awardsCount: number;
  lastAwardedAt: number | null;
}

interface MembersPageProps {
  member: Doc<"members">;
}

export function MembersPage({ member }: MembersPageProps) {
  const [activeTab, setActiveTab] = useState<MembersTab>("leaderboard");
  const [directorySearchTerm, setDirectorySearchTerm] = useState("");
  const [directoryRoleFilter, setDirectoryRoleFilter] = useState<RoleFilter>("all");
  const [managementSearchTerm, setManagementSearchTerm] = useState("");
  const [managementRoleFilter, setManagementRoleFilter] = useState<RoleFilter>("all");
  const [selectedMemberId, setSelectedMemberId] = useState<Id<"members"> | null>(null);
  const [awardPoints, setAwardPoints] = useState("1");
  const [awardReason, setAwardReason] = useState("");
  const [isAwarding, setIsAwarding] = useState(false);

  const members = useQuery(api.members.getAllMembers) || [];
  const leaderboard = useQuery(api.members.getLeaderboard) || [];
  const selectedMemberPoints = useQuery(
    api.members.getMemberMuPoints,
    selectedMemberId ? { memberId: selectedMemberId } : "skip"
  );

  const updateMemberRole = useMutation(api.members.updateMemberRole);
  const deleteMember = useMutation(api.members.deleteMember);
  const awardMuPoint = useMutation(api.members.awardMuPoint);

  const canManageRoles = member.role === "admin";
  const canAwardPoints = member.role === "admin" || member.role === "lead";

  const filteredDirectoryMembers = useMemo(
    () => filterMembersList(members, directorySearchTerm, directoryRoleFilter),
    [members, directorySearchTerm, directoryRoleFilter]
  );

  const filteredManagementMembers = useMemo(
    () => filterMembersList(members, managementSearchTerm, managementRoleFilter),
    [members, managementSearchTerm, managementRoleFilter]
  );

  const roleStats = useMemo(
    () => ({
      admin: members.filter((m) => m.role === "admin").length,
      lead: members.filter((m) => m.role === "lead").length,
      member: members.filter((m) => m.role === "member").length,
    }),
    [members]
  );

  const leaderboardStats = useMemo(() => {
    if (leaderboard.length === 0) {
      return { totalPoints: 0, totalAwards: 0, topMemberName: null as string | null };
    }
    const totalPoints = leaderboard.reduce((sum, entry) => sum + entry.totalPoints, 0);
    const totalAwards = leaderboard.reduce((sum, entry) => sum + entry.awardsCount, 0);
    const topMemberName = totalAwards > 0 && leaderboard[0] ? leaderboard[0].name : null;
    return { totalPoints, totalAwards, topMemberName };
  }, [leaderboard]);

  const leaderboardMap = useMemo(() => {
    const map = new Map<Id<"members">, LeaderboardEntry>();
    for (const entry of leaderboard) {
      map.set(entry.memberId, entry);
    }
    return map;
  }, [leaderboard]);

  const selectedMember = selectedMemberId
    ? members.find((m) => m._id === selectedMemberId) ?? null
    : null;

  const selectedMemberLeaderboardEntry = selectedMemberId
    ? leaderboardMap.get(selectedMemberId)
    : undefined;

  const selectedMemberAwardsCount = selectedMemberLeaderboardEntry?.awardsCount ?? 0;
  const selectedMemberTotalPoints = selectedMemberLeaderboardEntry?.totalPoints ?? 0;
  const selectedMemberAwardsLabel = selectedMemberAwardsCount === 1 ? "award" : "awards";

  const isHistoryLoading = selectedMemberId !== null && selectedMemberPoints === undefined;
  const memberHistory = selectedMemberPoints ?? [];

  useEffect(() => {
    if (!canManageRoles && activeTab === "management") {
      setActiveTab("leaderboard");
    }
  }, [canManageRoles, activeTab]);

  const tabs = useMemo(() => {
    const base: Array<{ id: MembersTab; label: string; icon: LucideIcon }> = [
      { id: "leaderboard", label: "leaderboard", icon: Trophy },
      { id: "directory", label: "directory", icon: Users },
    ];

    if (canManageRoles) {
      base.push({ id: "management", label: "management", icon: ShieldCheck });
    }

    return base;
  }, [canManageRoles]);

  const handleRoleChange = async (memberId: Id<"members">, newRole: Role) => {
    try {
      await updateMemberRole({ memberId, newRole });
      toast.success("member role updated successfully");
    } catch (error) {
      toast.error("failed to update member role");
    }
  };

  const handleDeleteMember = async (memberToRemove: Doc<"members">) => {
    if (!confirm(`Remove ${memberToRemove.name}?`)) return;
    try {
      await deleteMember({ memberId: memberToRemove._id });
      toast.success("member removed");
    } catch (error) {
      toast.error("failed to remove member");
    }
  };

  const formatJoinDate = (timestamp: number) => {
    return new Date(timestamp)
      .toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
      .toLowerCase();
  };

  const formatAwardDate = (timestamp: number | null) => {
    if (!timestamp) return "never";
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatHistoryDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatPoints = (value: number) => {
    const minimumFractionDigits = Number.isInteger(value) ? 0 : 1;
    return value.toLocaleString(undefined, {
      minimumFractionDigits,
      maximumFractionDigits: minimumFractionDigits,
    });
  };

  const openMemberDetails = (id: Id<"members">) => {
    setSelectedMemberId(id);
    setAwardPoints("1");
    setAwardReason("");
    setIsAwarding(false);
  };

  const closeMemberDetails = () => {
    setSelectedMemberId(null);
    setAwardPoints("1");
    setAwardReason("");
    setIsAwarding(false);
  };

  const handleAwardSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedMemberId) return;

    const parsedPoints = Number(awardPoints);
    if (!Number.isFinite(parsedPoints) || parsedPoints <= 0) {
      toast.error("enter a positive number of μpoints");
      return;
    }

    const trimmedReason = awardReason.trim();
    if (!trimmedReason) {
      toast.error("a reason is required");
      return;
    }

    try {
      setIsAwarding(true);
      await awardMuPoint({
        memberId: selectedMemberId,
        points: parsedPoints,
        reason: trimmedReason,
      });
      toast.success("μpoints awarded!");
      setAwardReason("");
      setAwardPoints("1");
    } catch (error) {
      toast.error("failed to award μpoints");
    } finally {
      setIsAwarding(false);
    }
  };

  const getTabButtonClass = (tabId: MembersTab) =>
    clsx(
      "px-4 py-2 rounded-xl text-xs font-mono tracking-widest uppercase transition",
      "border flex items-center gap-2",
      tabId === activeTab
        ? "bg-gradient-orange-red text-void-black border-transparent shadow-[0_8px_24px_rgba(249,115,22,0.3)]"
        : "bg-glass border-border-glass text-text-muted hover:text-text-primary"
    );
  return (
    <div className="space-y-6">
      <div className="glass-panel relative overflow-hidden p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sunset-orange/10 via-transparent to-accent-purple/20" />
        <div className="pointer-events-none absolute -top-16 -right-12 h-48 w-48 rounded-full bg-sunset-orange/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-52 w-52 rounded-full bg-accent-purple/20 blur-3xl" />
        <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-widest text-white/70">
              <Sparkles size={14} />
              <span>team energy</span>
            </div>
            <h1 className="mt-4 text-3xl font-light md:text-4xl">team members</h1>
            <p className="mt-2 max-w-xl text-text-muted">
              celebrate μpoints, keep the hype rolling, and stay on top of everyone in frc team 7157.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-widest">
              <span className="badge bg-white/10 text-white/70">
                your role: {member.role}
              </span>
              {leaderboardStats.topMemberName && (
                <span className="badge bg-sunset-orange/20 text-sunset-orange">
                  leading: {leaderboardStats.topMemberName}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="rounded-2xl bg-void-black/40 px-6 py-4">
              <p className="text-3xl font-light text-white">{members.length}</p>
              <p className="text-xs text-text-dim">members</p>
            </div>
            <div className="rounded-2xl bg-void-black/40 px-6 py-4">
              <p className="text-3xl font-light text-sunset-orange">
                {formatPoints(leaderboardStats.totalPoints)}
              </p>
              <p className="text-xs text-text-dim">μpoints shared</p>
            </div>
            <div className="rounded-2xl bg-void-black/40 px-6 py-4">
              <p className="text-3xl font-light text-accent-purple">
                {leaderboardStats.totalAwards}
              </p>
              <p className="text-xs text-text-dim">recognitions</p>
            </div>
            <div className="rounded-2xl bg-void-black/40 px-6 py-4">
              <p className="text-3xl font-light text-white">
                {formatPoints(leaderboardMap.get(member._id)?.totalPoints ?? 0)}
              </p>
              <p className="text-xs text-text-dim">your μpoints</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card-modern relative overflow-hidden text-center">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-error-red/20 via-transparent to-transparent" />
          <div className="relative">
            <div className="text-2xl font-light text-error-red mb-1">{roleStats.admin}</div>
            <div className="text-sm text-text-muted">admins</div>
          </div>
        </div>
        <div className="card-modern relative overflow-hidden text-center">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-yellow-400/20 via-transparent to-transparent" />
          <div className="relative">
            <div className="text-2xl font-light text-yellow-400 mb-1">{roleStats.lead}</div>
            <div className="text-sm text-text-muted">leads</div>
          </div>
        </div>
        <div className="card-modern relative overflow-hidden text-center">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-400/15 via-transparent to-transparent" />
          <div className="relative">
            <div className="text-2xl font-light text-blue-400 mb-1">{roleStats.member}</div>
            <div className="text-sm text-text-muted">members</div>
          </div>
        </div>
      </div>

      <div className="glass-panel p-4">
        <div className="flex flex-wrap gap-3">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={getTabButtonClass(id)}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "leaderboard" && (
        <LeaderboardTab
          entries={leaderboard}
          currentMemberId={member._id}
          onSelectMember={openMemberDetails}
          formatPoints={formatPoints}
          formatAwardDate={formatAwardDate}
          stats={leaderboardStats}
          canAwardPoints={canAwardPoints}
        />
      )}

      {activeTab === "directory" && (
        <DirectoryTab
          members={filteredDirectoryMembers}
          searchTerm={directorySearchTerm}
          onSearchTermChange={setDirectorySearchTerm}
          roleFilter={directoryRoleFilter}
          onRoleFilterChange={setDirectoryRoleFilter}
          formatJoinDate={formatJoinDate}
          currentMemberId={member._id}
          onSelectMember={openMemberDetails}
          leaderboardByMember={leaderboardMap}
          formatPoints={formatPoints}
        />
      )}

      {activeTab === "management" && canManageRoles && (
        <ManagementTab
          members={filteredManagementMembers}
          searchTerm={managementSearchTerm}
          onSearchTermChange={setManagementSearchTerm}
          roleFilter={managementRoleFilter}
          onRoleFilterChange={setManagementRoleFilter}
          formatJoinDate={formatJoinDate}
          currentMemberId={member._id}
          onRoleChange={handleRoleChange}
          onDeleteMember={handleDeleteMember}
          leaderboardByMember={leaderboardMap}
          formatPoints={formatPoints}
        />
      )}

      {selectedMember && (
        <Modal onClose={closeMemberDetails} isOpen title="μpoint details" maxWidthClassName="max-w-3xl">
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div>
                <h3 className="text-2xl font-light text-text-primary">
                  {selectedMember?.name ?? "team member"}
                </h3>
                {selectedMember?.email && (
                  <p className="text-sm text-text-muted mt-1">{selectedMember.email}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-4xl font-light text-sunset-orange">
                  +{formatPoints(selectedMemberTotalPoints)}
                </p>
                <p className="text-xs text-text-dim">total μpoints</p>
                <p className="text-xs text-text-muted mt-1">
                  {selectedMemberAwardsCount.toLocaleString()} {selectedMemberAwardsLabel}
                </p>
              </div>
            </div>

            {canAwardPoints && (
              <form onSubmit={handleAwardSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-[140px,1fr] gap-4">
                  <div>
                    <label className="text-xs font-mono uppercase tracking-widest text-text-secondary mb-2 block">
                      μpoints
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      className="input-modern"
                      value={awardPoints}
                      onChange={(e) => setAwardPoints(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-mono uppercase tracking-widest text-text-secondary mb-2 block">
                      reason
                    </label>
                    <textarea
                      className="input-modern min-h-[120px]"
                      value={awardReason}
                      onChange={(e) => setAwardReason(e.target.value)}
                      placeholder="describe why this member earned μpoints..."
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="btn-modern btn-secondary flex items-center gap-2 px-6 py-3"
                    disabled={isAwarding}
                  >
                    <PlusCircle size={18} />
                    {isAwarding ? "awarding..." : "award μpoints"}
                  </button>
                </div>
              </form>
            )}

            <div>
              <h4 className="text-sm font-mono text-text-secondary mb-3 uppercase tracking-widest">
                μpoint history
              </h4>
              {isHistoryLoading ? (
                <p className="text-sm text-text-muted">loading history...</p>
              ) : memberHistory.length === 0 ? (
                <p className="text-sm text-text-muted">
                  {selectedMember?.name ?? "this member"} hasn't received any μpoints yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {memberHistory.map((award) => (
                    <div
                      key={award._id}
                      className="bg-glass border border-border-glass rounded-2xl p-5"
                    >
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div>
                          <p className="text-lg font-light text-sunset-orange">
                            +{formatPoints(award.points)} μpoints
                          </p>
                          <p className="text-sm text-text-primary mt-2">{award.reason}</p>
                        </div>
                        <div className="text-right text-xs text-text-dim">
                          <p>{formatHistoryDate(award.createdAt)}</p>
                          <p className="mt-1 text-text-muted">
                            awarded by {award.assignedBy.name}
                            {award.assignedBy.memberId === member._id ? " (you)" : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

interface LeaderboardTabProps {
  entries: LeaderboardEntry[];
  onSelectMember: (id: Id<"members">) => void;
  currentMemberId: Id<"members">;
  formatPoints: (value: number) => string;
  formatAwardDate: (timestamp: number | null) => string;
  stats: {
    totalPoints: number;
    totalAwards: number;
    topMemberName: string | null;
  };
  canAwardPoints: boolean;
}

function LeaderboardTab({
  entries,
  onSelectMember,
  currentMemberId,
  formatPoints,
  formatAwardDate,
  stats,
  canAwardPoints,
}: LeaderboardTabProps) {
  const leaderPoints = entries[0]?.totalPoints ?? 0;

  return (
    <div className="space-y-4">
      <div className="glass-panel relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sunset-orange/15 via-transparent to-amber-400/10" />
        <div className="pointer-events-none absolute -bottom-16 right-0 h-56 w-56 rounded-full bg-sunset-orange/20 blur-3xl" />
        <div className="pointer-events-none absolute -top-20 left-0 h-40 w-40 rounded-full bg-accent-purple/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3 text-text-primary">
              <Trophy size={28} className="text-sunset-orange" />
              <h2 className="text-2xl font-light md:text-3xl">μpoint leaderboard</h2>
            </div>
            <p className="mt-2 text-sm text-text-muted">
              {canAwardPoints
                ? "tap anyone to celebrate them with even more μpoints or relive every shoutout."
                : "tap anyone to relive their μpoint shoutouts and see how the team is glowing."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center text-xs uppercase tracking-widest text-text-dim">
            <div>
              <p className="text-3xl font-light text-sunset-orange">
                +{formatPoints(stats.totalPoints)}
              </p>
              <p>μpoints</p>
            </div>
            <div>
              <p className="text-3xl font-light text-accent-purple">{stats.totalAwards}</p>
              <p>shoutouts</p>
            </div>
          </div>
        </div>
        {stats.topMemberName && (
          <div className="relative mt-6 text-sm text-text-muted">
            🏆 leading the charge: <span className="text-text-primary">{stats.topMemberName}</span>
          </div>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="glass-panel p-8 text-center text-text-muted">
          no μpoints have been awarded yet. start celebrating teammates to fill this space with fireworks.
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry, index) => {
            const isCurrent = entry.memberId === currentMemberId;
            const decoration = getRankDecorations(index);
            const IconComponent = decoration.icon;
            const progressRaw =
              leaderPoints > 0
                ? (entry.totalPoints / leaderPoints) * 100
                : entry.totalPoints > 0
                ? 100
                : 0;
            const progressWidth =
              entry.totalPoints > 0
                ? Math.max(8, Math.min(progressRaw, 100))
                : Math.min(progressRaw, 100);
            const awardsSummary =
              entry.awardsCount === 0
                ? "ready for their first shoutout"
                : `${entry.awardsCount} ${entry.awardsCount === 1 ? "shoutout" : "shoutouts"} logged`;
            const lastAwardedText =
              entry.lastAwardedAt !== null
                ? `last boost ${formatAwardDate(entry.lastAwardedAt)}`
                : "awaiting first μpoint";

            return (
              <button
                key={entry.memberId}
                type="button"
                onClick={() => onSelectMember(entry.memberId)}
                className={clsx(
                  "group relative w-full overflow-hidden rounded-3xl border px-6 py-6 text-left transition duration-300 ease-out hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sunset-orange/60",
                  decoration.containerClass,
                  isCurrent && "shadow-lg shadow-sunset-orange/25 ring-2 ring-sunset-orange/60"
                )}
              >
                <div
                  className={clsx(
                    "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80 transition duration-300 group-hover:opacity-100",
                    decoration.glowClass
                  )}
                />
                <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-5">
                    <div
                      className={clsx(
                        "relative flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-semibold",
                        decoration.rankClass
                      )}
                    >
                      #{index + 1}
                      {IconComponent && (
                        <IconComponent
                          size={20}
                          className={clsx("absolute -top-2 -right-2", decoration.iconClass)}
                        />
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-3 text-lg font-medium text-white">
                        <span>{entry.name}</span>
                        {isCurrent && (
                          <span className="badge bg-sunset-orange text-void-black">that's you!</span>
                        )}
                        <RoleBadge role={entry.role} />
                      </div>
                      <p className="text-sm text-text-muted">{awardsSummary}</p>
                      <p className="mt-1 text-xs uppercase tracking-widest text-text-dim">{lastAwardedText}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-light text-sunset-orange">
                      +{formatPoints(entry.totalPoints)}
                    </p>
                    <p className="text-xs uppercase tracking-[0.3em] text-text-dim">μpoints</p>
                  </div>
                </div>
                <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-void-black/40">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-orange-red transition-all duration-700 ease-out"
                    style={{ width: `${progressWidth}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface DirectoryTabProps {
  members: Doc<"members">[];
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  roleFilter: RoleFilter;
  onRoleFilterChange: (value: RoleFilter) => void;
  formatJoinDate: (timestamp: number) => string;
  currentMemberId: Id<"members">;
  onSelectMember: (id: Id<"members">) => void;
  leaderboardByMember: Map<Id<"members">, LeaderboardEntry>;
  formatPoints: (value: number) => string;
}

function DirectoryTab({
  members,
  searchTerm,
  onSearchTermChange,
  roleFilter,
  onRoleFilterChange,
  formatJoinDate,
  currentMemberId,
  onSelectMember,
  leaderboardByMember,
  formatPoints,
}: DirectoryTabProps) {
  return (
    <div className="space-y-4">
      <MembersFilters
        searchTerm={searchTerm}
        onSearchTermChange={onSearchTermChange}
        roleFilter={roleFilter}
        onRoleFilterChange={onRoleFilterChange}
        placeholder="search by name or email..."
      />

      <div className="space-y-4">
        {members.length === 0 ? (
          <div className="glass-panel p-8 text-center text-text-muted">
            {searchTerm || roleFilter !== "all"
              ? "no members found matching your filters."
              : "no members found just yet."}
          </div>
        ) : (
          members.map((teamMember) => {
            const leaderboardEntry = leaderboardByMember.get(teamMember._id);
            const awardsSummary =
              leaderboardEntry && leaderboardEntry.awardsCount > 0
                ? `${leaderboardEntry.awardsCount} ${leaderboardEntry.awardsCount === 1 ? "shoutout" : "shoutouts"}`
                : "no μpoints yet";

            return (
              <button
                key={teamMember._id}
                type="button"
                className="group w-full text-left"
                onClick={() => onSelectMember(teamMember._id)}
              >
                <div className="card-modern transition duration-200 group-hover:-translate-y-0.5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="avatar">
                        {teamMember.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-3 text-lg font-light text-text-primary">
                          <span>{teamMember.name}</span>
                          {teamMember._id === currentMemberId && (
                            <span className="text-xs text-sunset-orange bg-sunset-orange-dim px-2 py-0.5 rounded-full">
                              you
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-text-muted">{teamMember.email}</p>
                        <p className="text-xs text-text-dim mt-1">
                          joined {formatJoinDate(teamMember.joinedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-start gap-2 text-right md:items-end">
                      <RoleBadge role={teamMember.role} />
                      <p className="text-xs text-text-muted">
                        +{formatPoints(leaderboardEntry?.totalPoints ?? 0)} μpoints · {awardsSummary}
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
interface ManagementTabProps {
  members: Doc<"members">[];
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  roleFilter: RoleFilter;
  onRoleFilterChange: (value: RoleFilter) => void;
  formatJoinDate: (timestamp: number) => string;
  currentMemberId: Id<"members">;
  onRoleChange: (memberId: Id<"members">, newRole: Role) => void;
  onDeleteMember: (member: Doc<"members">) => void;
  leaderboardByMember: Map<Id<"members">, LeaderboardEntry>;
  formatPoints: (value: number) => string;
}

function ManagementTab({
  members,
  searchTerm,
  onSearchTermChange,
  roleFilter,
  onRoleFilterChange,
  formatJoinDate,
  currentMemberId,
  onRoleChange,
  onDeleteMember,
  leaderboardByMember,
  formatPoints,
}: ManagementTabProps) {
  return (
    <div className="space-y-4">
      <MembersFilters
        searchTerm={searchTerm}
        onSearchTermChange={onSearchTermChange}
        roleFilter={roleFilter}
        onRoleFilterChange={onRoleFilterChange}
        placeholder="search and manage teammates..."
      />

      <div className="glass-panel p-6">
        <h4 className="text-sm font-mono text-text-secondary mb-4 uppercase tracking-widest">
          role permissions
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-3">
            <span className="badge badge-rejected">admin</span>
            <span className="text-text-muted">full access to every system</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="badge badge-pending">lead</span>
            <span className="text-text-muted">manage meetings & purchases</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="badge badge-ordered">member</span>
            <span className="text-text-muted">submit purchase requests</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {members.length === 0 ? (
          <div className="glass-panel p-8 text-center text-text-muted">
            {searchTerm || roleFilter !== "all"
              ? "no teammates match your filters."
              : "no teammates to manage just yet."}
          </div>
        ) : (
          members.map((teamMember) => {
            const leaderboardEntry = leaderboardByMember.get(teamMember._id);
            const awardsSummary =
              leaderboardEntry && leaderboardEntry.awardsCount > 0
                ? `${leaderboardEntry.awardsCount} ${leaderboardEntry.awardsCount === 1 ? "shoutout" : "shoutouts"}`
                : "no μpoints yet";
            const isSelf = teamMember._id === currentMemberId;

            return (
              <div key={teamMember._id} className="card-modern">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="avatar">
                      {teamMember.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-3 text-lg font-light text-text-primary">
                        <span>{teamMember.name}</span>
                        {isSelf && (
                          <span className="text-xs text-sunset-orange bg-sunset-orange-dim px-2 py-0.5 rounded-full">
                            you
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-muted">{teamMember.email}</p>
                      <p className="text-xs text-text-dim mt-1">
                        joined {formatJoinDate(teamMember.joinedAt)}
                      </p>
                      <p className="text-xs text-text-muted mt-1">
                        +{formatPoints(leaderboardEntry?.totalPoints ?? 0)} μpoints · {awardsSummary}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center md:gap-4">
                    {isSelf ? (
                      <div className="rounded-xl border border-border-glass px-3 py-2 text-xs text-text-muted">
                        you can't change your own role
                      </div>
                    ) : (
                      <select
                        value={teamMember.role}
                        onChange={(e) => onRoleChange(teamMember._id, e.target.value as Role)}
                        className="input-modern py-2 px-4 text-sm"
                      >
                        <option value="member">member</option>
                        <option value="lead">lead</option>
                        <option value="admin">admin</option>
                      </select>
                    )}
                    {!isSelf && (
                      <button
                        type="button"
                        className="btn-modern btn-danger flex items-center gap-2 px-4 py-2"
                        onClick={() => onDeleteMember(teamMember)}
                        title="Remove member"
                      >
                        <Trash2 size={16} />
                        remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="glass-panel p-6 border border-yellow-500/30">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-mono uppercase tracking-widest text-yellow-400 mb-2">admin note</h4>
            <p className="text-sm text-text-muted">
              roles control access across the entire system. double-check before promoting or removing a teammate. you still can't change your own role for safety.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MembersFiltersProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  roleFilter: RoleFilter;
  onRoleFilterChange: (value: RoleFilter) => void;
  placeholder: string;
}

function MembersFilters({
  searchTerm,
  onSearchTermChange,
  roleFilter,
  onRoleFilterChange,
  placeholder,
}: MembersFiltersProps) {
  return (
    <div className="glass-panel p-6">
      <div className="flex flex-col gap-4 md:flex-row">
        <input
          type="text"
          placeholder={placeholder}
          className="input-modern flex-1"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
        />
        <select
          className="input-modern md:w-48"
          value={roleFilter}
          onChange={(event) => onRoleFilterChange(event.target.value as RoleFilter)}
        >
          <option value="all">all roles</option>
          <option value="admin">admins only</option>
          <option value="lead">leads only</option>
          <option value="member">members only</option>
        </select>
      </div>
    </div>
  );
}

function filterMembersList(
  members: Doc<"members">[],
  searchTerm: string,
  roleFilter: RoleFilter
) {
  const term = searchTerm.trim().toLowerCase();
  return members.filter((member) => {
    const matchesSearch =
      term.length === 0 ||
      member.name.toLowerCase().includes(term) ||
      member.email.toLowerCase().includes(term);
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });
}

interface RankDecoration {
  containerClass: string;
  rankClass: string;
  glowClass: string;
  icon?: LucideIcon;
  iconClass?: string;
}

function getRankDecorations(index: number): RankDecoration {
  if (index === 0) {
    return {
      containerClass:
        "border-transparent bg-gradient-to-r from-amber-500/25 via-sunset-orange/15 to-red-500/15 shadow-[0_20px_60px_rgba(249,115,22,0.25)]",
      rankClass: "bg-gradient-orange-red text-void-black shadow-[0_10px_30px_rgba(249,115,22,0.45)]",
      glowClass: "from-sunset-orange/30 via-amber-500/20 to-red-500/20",
      icon: Crown,
      iconClass: "text-amber-200 drop-shadow-[0_0_12px_rgba(249,115,22,0.6)]",
    };
  }

  if (index === 1) {
    return {
      containerClass: "border-white/20 bg-white/10 backdrop-blur",
      rankClass: "bg-white/30 text-white",
      glowClass: "from-white/25 via-white/10 to-transparent",
      icon: Medal,
      iconClass: "text-white/80 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]",
    };
  }

  if (index === 2) {
    return {
      containerClass: "border-accent-purple/30 bg-accent-purple/15",
      rankClass: "bg-accent-purple text-white/90",
      glowClass: "from-accent-purple/25 via-indigo-500/20 to-transparent",
      icon: Star,
      iconClass: "text-indigo-200 drop-shadow-[0_0_8px_rgba(165,180,252,0.6)]",
    };
  }

  return {
    containerClass: "border-border-glass bg-glass",
    rankClass: "bg-white/5 text-text-muted",
    glowClass: "from-white/10 via-transparent to-transparent",
  };
}

function RoleBadge({ role }: { role: Role }) {
  const getBadgeClass = () => {
    switch (role) {
      case "admin":
        return "badge-rejected";
      case "lead":
        return "badge-pending";
      default:
        return "badge-ordered";
    }
  };

  return <span className={clsx("badge", getBadgeClass())}>{role}</span>;
}
