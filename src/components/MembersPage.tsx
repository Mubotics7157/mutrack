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
  ClipboardList,
  CheckCircle2,
  Target,
} from "lucide-react";
import { Modal } from "./Modal";

type TabKey = "leaderboard" | "directory" | "management";

type LeaderboardEntry = {
  memberId: Id<"members">;
  name: string;
  email: string;
  role: "admin" | "lead" | "member";
  totalPoints: number;
  awardsCount: number;
  lastAwardedAt: number | null;
};

type BountyEntry = {
  _id: Id<"bounties">;
  title: string;
  description: string | null;
  points: number;
  status: "open" | "completed" | "cancelled";
  createdAt: number;
  createdBy: { memberId: Id<"members">; name: string };
  completedAt: number | null;
  completedBy: { memberId: Id<"members">; name: string } | null;
  completionNotes: string | null;
};

type BountyBoardData = {
  openBounties: BountyEntry[];
  recentlyCompleted: BountyEntry[];
};

interface MembersPageProps {
  member: Doc<"members">;
}

export function MembersPage({ member }: MembersPageProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("leaderboard");
  const [selectedMemberId, setSelectedMemberId] = useState<Id<"members"> | null>(null);
  const [awardPoints, setAwardPoints] = useState("1");
  const [awardReason, setAwardReason] = useState("");
  const [isAwarding, setIsAwarding] = useState(false);

  const [directorySearchTerm, setDirectorySearchTerm] = useState("");
  const [directoryRoleFilter, setDirectoryRoleFilter] = useState<string>("all");
  const [managementSearchTerm, setManagementSearchTerm] = useState("");
  const [managementRoleFilter, setManagementRoleFilter] = useState<string>("all");
  const [isCreatingBounty, setIsCreatingBounty] = useState(false);
  const [completingBountyId, setCompletingBountyId] =
    useState<Id<"bounties"> | null>(null);

  const members = useQuery(api.members.getAllMembers) || [];
  const leaderboard = (useQuery(api.members.getLeaderboard) || []) as LeaderboardEntry[];
  const bountyBoardQuery = useQuery(api.bounties.getBounties) as
    | BountyBoardData
    | undefined;
  const bountyBoard =
    bountyBoardQuery ?? ({
      openBounties: [],
      recentlyCompleted: [],
    } as BountyBoardData);
  const selectedMemberPoints = useQuery(
    api.members.getMemberMuPoints,
    selectedMemberId ? { memberId: selectedMemberId } : "skip"
  );

  const updateMemberRole = useMutation(api.members.updateMemberRole);
  const deleteMember = useMutation(api.members.deleteMember);
  const awardMuPoint = useMutation(api.members.awardMuPoint);
  const createBounty = useMutation(api.bounties.createBounty);
  const completeBounty = useMutation(api.bounties.completeBounty);

  const canManageRoles = member.role === "admin";
  const canAwardPoints = member.role === "admin" || member.role === "lead";
  const canManageBounties = canAwardPoints;

  useEffect(() => {
    if (activeTab === "management" && !canManageRoles) {
      setActiveTab("leaderboard");
    }
  }, [activeTab, canManageRoles]);

  const filteredDirectoryMembers = useMemo(
    () => filterMembers(members, directorySearchTerm, directoryRoleFilter),
    [members, directorySearchTerm, directoryRoleFilter]
  );

  const filteredManagementMembers = useMemo(
    () => filterMembers(members, managementSearchTerm, managementRoleFilter),
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

  const selectedMember = selectedMemberId
    ? members.find((m) => m._id === selectedMemberId) ?? null
    : null;

  const selectedMemberLeaderboardEntry = selectedMemberId
    ? leaderboard.find((entry) => entry.memberId === selectedMemberId)
    : undefined;

  const selectedMemberAwardsCount = selectedMemberLeaderboardEntry?.awardsCount ?? 0;
  const selectedMemberTotalPoints = selectedMemberLeaderboardEntry?.totalPoints ?? 0;
  const selectedMemberAwardsLabel =
    selectedMemberAwardsCount === 1 ? "award" : "awards";

  const isHistoryLoading = selectedMemberId !== null && selectedMemberPoints === undefined;
  const memberHistory = selectedMemberPoints ?? [];

  const handleRoleChange = async (
    memberId: Id<"members">,
    newRole: "admin" | "lead" | "member"
  ) => {
    try {
      await updateMemberRole({ memberId, newRole });
      toast.success("member role updated successfully");
    } catch (error) {
      toast.error("failed to update member role");
    }
  };

  const handleMemberRemoval = async (targetMember: Doc<"members">) => {
    if (!confirm(`Remove ${targetMember.name}?`)) return;
    try {
      await deleteMember({ memberId: targetMember._id });
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

  const handleCreateBounty = async (input: {
    title: string;
    description: string | null;
    points: number;
  }) => {
    try {
      setIsCreatingBounty(true);
      const trimmedTitle = input.title.trim();
      const trimmedDescription = input.description?.trim();
      await createBounty({
        title: trimmedTitle,
        description: trimmedDescription ? trimmedDescription : undefined,
        points: input.points,
      });
      toast.success("bounty posted!");
      return true;
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : "failed to create bounty";
      toast.error(message);
      return false;
    } finally {
      setIsCreatingBounty(false);
    }
  };

  const handleCompleteBounty = async (input: {
    bountyId: Id<"bounties">;
    memberId: Id<"members">;
    notes: string | null;
  }) => {
    try {
      setCompletingBountyId(input.bountyId);
      const trimmedNotes = input.notes?.trim();
      await completeBounty({
        bountyId: input.bountyId,
        completedByMemberId: input.memberId,
        completionNotes: trimmedNotes ? trimmedNotes : undefined,
      });
      toast.success("bounty completed and μpoints awarded!");
      return true;
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : "failed to complete bounty";
      toast.error(message);
      return false;
    } finally {
      setCompletingBountyId(null);
    }
  };

  const visibleTabs = useMemo(
    () =>
      [
        {
          key: "leaderboard" as const,
          label: "leaderboard",
          icon: <Trophy size={16} className="text-sunset-orange" />,
        },
        {
          key: "directory" as const,
          label: "directory",
          icon: <Users size={16} className="text-accent-purple" />,
        },
        {
          key: "management" as const,
          label: "member management",
          icon: <ShieldCheck size={16} className="text-yellow-300" />,
          restricted: true,
        },
      ].filter((tab) => !tab.restricted || canManageRoles),
    [canManageRoles]
  );

  const getTabButtonClass = (tabKey: TabKey) =>
    clsx(
      "px-4 py-2 rounded-xl text-xs font-mono tracking-widest uppercase transition",
      "border flex items-center gap-2 backdrop-blur-sm",
      "shadow-sm hover:shadow-md",
      activeTab === tabKey
        ? "bg-gradient-to-r from-sunset-orange to-accent-purple text-void-black border-transparent shadow-[0_12px_32px_rgba(249,115,22,0.35)]"
        : "bg-glass border-border-glass text-text-muted hover:text-text-primary"
    );

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden glass-panel p-8">
        <div className="absolute -top-24 -left-12 h-48 w-48 rounded-full bg-gradient-to-br from-sunset-orange/40 via-amber-400/30 to-transparent blur-3xl" />
        <div className="absolute -bottom-16 -right-10 h-52 w-52 rounded-full bg-gradient-to-br from-accent-purple/40 via-pink-500/30 to-transparent blur-3xl" />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
            <div>
              <div className="flex items-center gap-2 text-text-primary">
                <Sparkles size={18} className="text-sunset-orange animate-pulse" />
                <h1 className="text-3xl font-light">team members</h1>
              </div>
              <p className="text-text-muted mt-2">
                celebrate wins, stay organized, and keep frc team 7157 buzzing.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 text-center">
              <div>
                <p className="text-3xl font-light text-sunset-orange">{members.length}</p>
                <p className="text-xs text-text-dim uppercase tracking-widest">humans</p>
              </div>
              <div>
                <p className="text-3xl font-light text-accent-purple">
                  {formatPoints(leaderboardStats.totalPoints)}
                </p>
                <p className="text-xs text-text-dim uppercase tracking-widest">μpoints</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {visibleTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={getTabButtonClass(tab.key)}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === "leaderboard" && (
        <LeaderboardTab
          leaderboard={leaderboard}
          leaderboardStats={leaderboardStats}
          onSelectMember={openMemberDetails}
          currentMemberId={member._id}
          formatPoints={formatPoints}
          formatAwardDate={formatAwardDate}
          canAwardPoints={canAwardPoints}
          bountyBoard={bountyBoard}
          members={members}
          canManageBounties={canManageBounties}
          onCreateBounty={handleCreateBounty}
          onCompleteBounty={handleCompleteBounty}
          isCreatingBounty={isCreatingBounty}
          completingBountyId={completingBountyId}
        />
      )}

      {activeTab === "directory" && (
        <DirectoryTab
          filteredMembers={filteredDirectoryMembers}
          searchTerm={directorySearchTerm}
          onSearchTermChange={setDirectorySearchTerm}
          roleFilter={directoryRoleFilter}
          onRoleFilterChange={setDirectoryRoleFilter}
          formatJoinDate={formatJoinDate}
          currentMemberId={member._id}
          roleStats={roleStats}
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
          onRemoveMember={handleMemberRemoval}
        />
      )}

      {selectedMemberId && (
        <Modal
          isOpen={selectedMemberId !== null}
          onClose={closeMemberDetails}
          title="μpoint details"
          maxWidthClassName="max-w-3xl"
        >
          <div className="space-y-6">
            <div className="relative overflow-hidden rounded-3xl border border-sunset-orange/20 bg-glass p-6">
              <div className="absolute inset-0 opacity-40">
                <div className="absolute -top-16 -left-12 h-36 w-36 rounded-full bg-gradient-to-br from-sunset-orange/60 via-amber-300/40 to-transparent blur-3xl" />
                <div className="absolute -bottom-16 -right-12 h-36 w-36 rounded-full bg-gradient-to-br from-accent-purple/50 via-pink-500/40 to-transparent blur-3xl" />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
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
                  <p className="text-xs text-text-dim uppercase tracking-widest">total μpoints</p>
                  <p className="text-xs text-text-muted mt-1">
                    {selectedMemberAwardsCount.toLocaleString()} {selectedMemberAwardsLabel}
                  </p>
                </div>
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
      <BountyBoard
        bountyBoard={bountyBoard}
        members={members}
        canManageBounties={canManageBounties}
        onCreateBounty={onCreateBounty}
        onCompleteBounty={onCompleteBounty}
        formatPoints={formatPoints}
        formatAwardDate={formatAwardDate}
        isCreatingBounty={isCreatingBounty}
        completingBountyId={completingBountyId}
      />
    </div>
  );
}

interface LeaderboardTabProps {
  leaderboard: LeaderboardEntry[];
  leaderboardStats: {
    totalPoints: number;
    totalAwards: number;
    topMemberName: string | null;
  };
  onSelectMember: (memberId: Id<"members">) => void;
  currentMemberId: Id<"members">;
  formatPoints: (value: number) => string;
  formatAwardDate: (timestamp: number | null) => string;
  canAwardPoints: boolean;
  bountyBoard: BountyBoardData;
  members: Doc<"members">[];
  canManageBounties: boolean;
  onCreateBounty: (input: {
    title: string;
    description: string | null;
    points: number;
  }) => Promise<boolean>;
  onCompleteBounty: (input: {
    bountyId: Id<"bounties">;
    memberId: Id<"members">;
    notes: string | null;
  }) => Promise<boolean>;
  isCreatingBounty: boolean;
  completingBountyId: Id<"bounties"> | null;
}

function LeaderboardTab({
  leaderboard,
  leaderboardStats,
  onSelectMember,
  currentMemberId,
  formatPoints,
  formatAwardDate,
  canAwardPoints,
  bountyBoard,
  members,
  canManageBounties,
  onCreateBounty,
  onCompleteBounty,
  isCreatingBounty,
  completingBountyId,
}: LeaderboardTabProps) {
  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);
  const leaderPoints = leaderboard[0]?.totalPoints ?? 0;

  return (
    <div className="space-y-6">
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
                ? "tap a teammate to celebrate them with μpoints and peek at their highlight reel."
                : "tap a teammate to explore their μpoint highlight reel."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-light text-sunset-orange">
                {formatPoints(leaderboardStats.totalPoints)}
              </p>
              <p className="text-xs text-text-dim uppercase tracking-widest">μpoints awarded</p>
            </div>
            <div>
              <p className="text-2xl font-light text-accent-purple">
                {leaderboardStats.totalAwards}
              </p>
              <p className="text-xs text-text-dim uppercase tracking-widest">recognitions logged</p>
            </div>
          </div>
        </div>
        {leaderboardStats.topMemberName && (
          <div className="relative z-10 mt-4 text-sm text-text-muted">
            🏆 leading the charge: {" "}
            <span className="text-text-primary">{leaderboardStats.topMemberName}</span>
          </div>
        )}
      </div>

      {leaderboard.length === 0 ? (
        <div className="glass-panel p-8 text-center">
          <p className="text-text-muted">
            no μpoints have been awarded yet. once recognitions are logged, the leaderboard will sparkle here.
          </p>
        </div>
      ) : (
        <>
          {topThree.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {topThree.map((entry, index) => (
                <SpotlightCard
                  key={entry.memberId}
                  entry={entry}
                  index={index}
                  formatPoints={formatPoints}
                  formatAwardDate={formatAwardDate}
                  isYou={entry.memberId === currentMemberId}
                  onSelect={() => onSelectMember(entry.memberId)}
                />
              ))}
            </div>
          )}

          {rest.length > 0 && (
            <div className="space-y-3">
              {rest.map((entry, index) => {
                const absoluteRank = index + topThree.length;
                const progressRaw = leaderPoints
                  ? Math.min(100, Math.max(6, Math.round((entry.totalPoints / leaderPoints) * 100)))
                  : 0;
                const progressWidth = `${progressRaw}%`;

                return (
                  <button
                    key={entry.memberId}
                    type="button"
                    onClick={() => onSelectMember(entry.memberId)}
                    className="w-full text-left"
                  >
                    <div className="card-modern hover:-translate-y-1 transition-transform bg-glass/80 border border-border-glass">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-glass via-white/10 to-transparent border border-white/10 flex items-center justify-center text-sm font-semibold text-text-secondary">
                            #{absoluteRank + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap text-text-primary">
                              <h4 className="font-light text-lg">{entry.name}</h4>
                              {entry.memberId === currentMemberId && (
                                <span className="text-xs text-sunset-orange bg-sunset-orange-dim px-2 py-0.5 rounded-full">
                                  you
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-text-muted">{entry.email}</p>
                            <p className="text-xs text-text-dim mt-1">
                              {entry.awardsCount === 0
                                ? "no μpoints yet"
                                : `${entry.awardsCount} ${
                                    entry.awardsCount === 1 ? "award" : "awards"
                                  } • last awarded ${formatAwardDate(entry.lastAwardedAt)}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-light text-sunset-orange">
                            +{formatPoints(entry.totalPoints)}
                          </p>
                          <p className="text-xs text-text-dim uppercase tracking-widest mt-1">
                            total μpoints
                          </p>
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
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface BountyBoardProps {
  bountyBoard: BountyBoardData;
  members: Doc<"members">[];
  canManageBounties: boolean;
  onCreateBounty: (input: {
    title: string;
    description: string | null;
    points: number;
  }) => Promise<boolean>;
  onCompleteBounty: (input: {
    bountyId: Id<"bounties">;
    memberId: Id<"members">;
    notes: string | null;
  }) => Promise<boolean>;
  formatPoints: (value: number) => string;
  formatAwardDate: (timestamp: number | null) => string;
  isCreatingBounty: boolean;
  completingBountyId: Id<"bounties"> | null;
}

function BountyBoard({
  bountyBoard,
  members,
  canManageBounties,
  onCreateBounty,
  onCompleteBounty,
  formatPoints,
  formatAwardDate,
  isCreatingBounty,
  completingBountyId,
}: BountyBoardProps) {
  const { openBounties, recentlyCompleted } = bountyBoard;
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPoints, setNewPoints] = useState("5");
  const [selectedBounty, setSelectedBounty] = useState<BountyEntry | null>(null);
  const [selectedMemberId, setSelectedMemberId] =
    useState<Id<"members"> | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => a.name.localeCompare(b.name)),
    [members]
  );

  const totalOpenPoints = openBounties.reduce((sum, bounty) => sum + bounty.points, 0);

  const formatTimestamp = (timestamp: number) =>
    new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  const closeModal = () => {
    setSelectedBounty(null);
    setSelectedMemberId(null);
    setCompletionNotes("");
  };

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) {
      toast.error("enter a bounty title");
      return;
    }

    const parsedPoints = Number(newPoints);
    if (!Number.isFinite(parsedPoints) || parsedPoints <= 0) {
      toast.error("enter a positive μpoint value");
      return;
    }

    const trimmedDescription = newDescription.trim();
    const wasCreated = await onCreateBounty({
      title: trimmedTitle,
      description: trimmedDescription ? trimmedDescription : null,
      points: parsedPoints,
    });

    if (wasCreated) {
      setNewTitle("");
      setNewDescription("");
      setNewPoints("5");
    }
  };

  const handleCompleteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedBounty) return;
    if (!selectedMemberId) {
      toast.error("select a member to reward");
      return;
    }

    const trimmedNotes = completionNotes.trim();
    const wasCompleted = await onCompleteBounty({
      bountyId: selectedBounty._id,
      memberId: selectedMemberId,
      notes: trimmedNotes ? trimmedNotes : null,
    });

    if (wasCompleted) {
      closeModal();
    }
  };

  return (
    <div className="glass-panel p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-text-primary">
            <ClipboardList size={20} className="text-accent-purple" />
            <h3 className="text-xl font-light">bounty board</h3>
          </div>
          <p className="text-sm text-text-muted mt-2">
            rally the team with high-impact tasks and reward the finishers with μpoints.
          </p>
        </div>
        <div className="flex items-center gap-6 text-right">
          <div>
            <p className="text-2xl font-light text-accent-purple">
              {openBounties.length}
            </p>
            <p className="text-xs text-text-dim uppercase tracking-widest">open bounties</p>
          </div>
          <div>
            <p className="text-2xl font-light text-sunset-orange">
              +{formatPoints(totalOpenPoints)}
            </p>
            <p className="text-xs text-text-dim uppercase tracking-widest">μpoints available</p>
          </div>
        </div>
      </div>

      {canManageBounties && (
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
            <div>
              <label className="text-xs font-mono uppercase tracking-widest text-text-secondary mb-2 block">
                bounty title
              </label>
              <input
                type="text"
                className="input-modern"
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder="e.g. design new pit display"
              />
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-widest text-text-secondary mb-2 block">
                μpoints reward
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                className="input-modern"
                value={newPoints}
                onChange={(event) => setNewPoints(event.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-text-secondary mb-2 block">
              description
            </label>
            <textarea
              className="input-modern min-h-[100px]"
              value={newDescription}
              onChange={(event) => setNewDescription(event.target.value)}
              placeholder="share context, deliverables, or links..."
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="btn-modern btn-secondary flex items-center gap-2 px-5 py-2.5"
              disabled={isCreatingBounty}
            >
              <Target size={18} />
              {isCreatingBounty ? "posting..." : "post bounty"}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-mono uppercase tracking-widest text-text-secondary">
            open bounties
          </h4>
          {openBounties.length === 0 && (
            <span className="text-xs text-text-dim">none yet — post one to get things rolling.</span>
          )}
        </div>
        {openBounties.length > 0 && (
          <div className="space-y-3">
            {openBounties.map((bounty) => (
              <div key={bounty._id} className="card-modern">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <p className="text-lg font-light text-text-primary">{bounty.title}</p>
                      {bounty.description && (
                        <p className="text-sm text-text-muted mt-2">{bounty.description}</p>
                      )}
                      <p className="text-xs text-text-dim mt-2">
                        posted by {bounty.createdBy.name} · {formatTimestamp(bounty.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-light text-accent-purple">
                        +{formatPoints(bounty.points)}
                      </p>
                      <p className="text-xs text-text-dim uppercase tracking-widest">μpoints</p>
                    </div>
                  </div>
                  {canManageBounties && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="btn-modern btn-primary flex items-center gap-2 px-4 py-2"
                        onClick={() => {
                          setSelectedBounty(bounty);
                          setSelectedMemberId(null);
                          setCompletionNotes("");
                        }}
                      >
                        <CheckCircle2 size={18} />
                        mark complete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-mono uppercase tracking-widest text-text-secondary">
          recently completed
        </h4>
        {recentlyCompleted.length === 0 ? (
          <div className="border border-border-glass/70 bg-glass rounded-2xl p-4 text-sm text-text-muted">
            no bounties have been completed yet.
          </div>
        ) : (
          <div className="space-y-3">
            {recentlyCompleted.map((bounty) => (
              <div
                key={bounty._id}
                className="border border-border-glass/60 bg-glass rounded-2xl p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-text-primary font-light">{bounty.title}</p>
                    <p className="text-xs text-text-dim mt-1">
                      completed by {bounty.completedBy?.name ?? "unknown"} on {formatAwardDate(bounty.completedAt)}
                    </p>
                    {bounty.completionNotes && (
                      <p className="text-sm text-text-muted mt-2 italic">
                        “{bounty.completionNotes}”
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-light text-sunset-orange">
                      +{formatPoints(bounty.points)}
                    </p>
                    <p className="text-xs text-text-dim uppercase tracking-widest">awarded</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={selectedBounty !== null}
        onClose={closeModal}
        title={selectedBounty ? `complete “${selectedBounty.title}”` : "complete bounty"}
        maxWidthClassName="max-w-lg"
      >
        {selectedBounty && (
          <form onSubmit={handleCompleteSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-mono uppercase tracking-widest text-text-secondary mb-2 block">
                credit μpoints to
              </label>
              <select
                className="input-modern"
                value={selectedMemberId ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedMemberId(value ? (value as Id<"members">) : null);
                }}
              >
                <option value="" disabled>
                  select a member
                </option>
                {sortedMembers.map((teamMember) => (
                  <option key={teamMember._id} value={teamMember._id}>
                    {teamMember.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-widest text-text-secondary mb-2 block">
                completion notes
              </label>
              <textarea
                className="input-modern min-h-[120px]"
                value={completionNotes}
                onChange={(event) => setCompletionNotes(event.target.value)}
                placeholder="celebrate what made this bounty complete"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" className="btn-modern" onClick={closeModal}>
                cancel
              </button>
              <button
                type="submit"
                className="btn-modern btn-primary flex items-center gap-2 px-5 py-2.5"
                disabled={completingBountyId === selectedBounty._id}
              >
                <CheckCircle2 size={18} />
                {completingBountyId === selectedBounty._id
                  ? "completing..."
                  : `award ${formatPoints(selectedBounty.points)} μpoints`}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

interface SpotlightCardProps {
  entry: LeaderboardEntry;
  index: number;
  formatPoints: (value: number) => string;
  formatAwardDate: (timestamp: number | null) => string;
  isYou: boolean;
  onSelect: () => void;
}

function SpotlightCard({
  entry,
  index,
  formatPoints,
  formatAwardDate,
  isYou,
  onSelect,
}: SpotlightCardProps) {
  const backgroundClass = getSpotlightBackground(index);
  return (
    <button
      type="button"
      onClick={onSelect}
      className="relative overflow-hidden rounded-3xl border border-white/15 p-6 text-left transition-transform hover:-translate-y-1"
    >
      <div className={clsx("absolute inset-0 opacity-80", backgroundClass)} />
      <div className="relative z-10 flex flex-col h-full justify-between gap-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xl font-light">{entry.name}</h4>
              <span className="badge bg-black/40 border-white/20 text-white">#{index + 1}</span>
              {isYou && (
                <span className="text-xs bg-white/30 text-white px-2 py-0.5 rounded-full">
                  you
                </span>
              )}
            </div>
            <p className="text-sm text-white/70 mt-1">{entry.email}</p>
            <p className="text-xs text-white/60 mt-2">
              {entry.awardsCount === 0
                ? "no μpoints yet"
                : `${entry.awardsCount} ${
                    entry.awardsCount === 1 ? "award" : "awards"
                  } • last awarded ${formatAwardDate(entry.lastAwardedAt)}`}
            </p>
          </div>
          {index === 0 ? (
            <Crown size={32} className="text-amber-200 drop-shadow-lg" />
          ) : (
            <Trophy size={28} className="text-white/80" />
          )}
        </div>
        <div>
          <p className="text-4xl font-light drop-shadow-lg">
            +{formatPoints(entry.totalPoints)}
          </p>
          <p className="text-xs uppercase tracking-widest text-white/70 mt-1">
            total μpoints
          </p>
        </div>
      </div>
    </button>
  );
}

interface DirectoryTabProps {
  filteredMembers: Doc<"members">[];
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  formatJoinDate: (timestamp: number) => string;
  currentMemberId: Id<"members">;
  roleStats: { admin: number; lead: number; member: number };
}

function DirectoryTab({
  filteredMembers,
  searchTerm,
  onSearchTermChange,
  roleFilter,
  onRoleFilterChange,
  formatJoinDate,
  currentMemberId,
  roleStats,
}: DirectoryTabProps) {
  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="search by name or email..."
            className="input-modern flex-1"
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
          />
          <select
            className="input-modern md:w-48"
            value={roleFilter}
            onChange={(e) => onRoleFilterChange(e.target.value)}
          >
            <option value="all">all roles</option>
            <option value="admin">admins only</option>
            <option value="lead">leads only</option>
            <option value="member">members only</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-modern text-center">
          <div className="text-2xl font-light text-error-red mb-1">{roleStats.admin}</div>
          <div className="text-sm text-text-muted">admins</div>
        </div>
        <div className="card-modern text-center">
          <div className="text-2xl font-light text-yellow-400 mb-1">{roleStats.lead}</div>
          <div className="text-sm text-text-muted">leads</div>
        </div>
        <div className="card-modern text-center">
          <div className="text-2xl font-light text-blue-400 mb-1">{roleStats.member}</div>
          <div className="text-sm text-text-muted">members</div>
        </div>
      </div>

      <div className="glass-panel p-6">
        <h4 className="text-sm font-mono text-text-secondary mb-4 uppercase tracking-widest">
          role permissions
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-3">
            <span className="badge badge-rejected">admin</span>
            <span className="text-text-muted">full access to all features</span>
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
        {filteredMembers.length === 0 ? (
          <div className="glass-panel p-8 text-center">
            <p className="text-text-muted">
              {searchTerm || roleFilter !== "all"
                ? "no members found matching your criteria"
                : "no members found"}
            </p>
          </div>
        ) : (
          filteredMembers.map((teamMember) => (
            <div key={teamMember._id} className="card-modern">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="avatar">{teamMember.name.charAt(0).toUpperCase()}</div>
                  <div>
                    <h4 className="font-light text-lg text-text-primary flex items-center gap-2">
                      {teamMember.name}
                      {teamMember._id === currentMemberId && (
                        <span className="text-xs text-sunset-orange bg-sunset-orange-dim px-2 py-0.5 rounded-full">
                          you
                        </span>
                      )}
                    </h4>
                    <p className="text-sm text-text-muted">{teamMember.email}</p>
                    <p className="text-xs text-text-dim mt-1">
                      joined {formatJoinDate(teamMember.joinedAt)}
                    </p>
                  </div>
                </div>
                <RoleBadge role={teamMember.role} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface ManagementTabProps {
  members: Doc<"members">[];
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  formatJoinDate: (timestamp: number) => string;
  currentMemberId: Id<"members">;
  onRoleChange: (
    memberId: Id<"members">,
    newRole: "admin" | "lead" | "member"
  ) => Promise<void>;
  onRemoveMember: (member: Doc<"members">) => Promise<void>;
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
  onRemoveMember,
}: ManagementTabProps) {
  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 border border-yellow-500/30">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="search by name or email..."
            className="input-modern flex-1"
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
          />
          <select
            className="input-modern md:w-48"
            value={roleFilter}
            onChange={(e) => onRoleFilterChange(e.target.value)}
          >
            <option value="all">all roles</option>
            <option value="admin">admins only</option>
            <option value="lead">leads only</option>
            <option value="member">members only</option>
          </select>
        </div>
        <p className="text-xs text-text-muted mt-4">
          adjust roles, remove members, and keep access tidy. changes apply instantly.
        </p>
      </div>

      <div className="space-y-4">
        {members.length === 0 ? (
          <div className="glass-panel p-8 text-center">
            <p className="text-text-muted">no members match your filters right now.</p>
          </div>
        ) : (
          members.map((teamMember) => (
            <div key={teamMember._id} className="card-modern border border-white/10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="avatar">{teamMember.name.charAt(0).toUpperCase()}</div>
                  <div>
                    <h4 className="font-light text-lg text-text-primary flex items-center gap-2">
                      {teamMember.name}
                      {teamMember._id === currentMemberId && (
                        <span className="text-xs text-sunset-orange bg-sunset-orange-dim px-2 py-0.5 rounded-full">
                          you
                        </span>
                      )}
                    </h4>
                    <p className="text-sm text-text-muted">{teamMember.email}</p>
                    <p className="text-xs text-text-dim mt-1">
                      joined {formatJoinDate(teamMember.joinedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={teamMember.role}
                    onChange={(e) =>
                      onRoleChange(teamMember._id, e.target.value as "admin" | "lead" | "member")
                    }
                    className="input-modern py-2 px-4 text-sm"
                    disabled={teamMember._id === currentMemberId}
                  >
                    <option value="member">member</option>
                    <option value="lead">lead</option>
                    <option value="admin">admin</option>
                  </select>
                  {teamMember._id !== currentMemberId && (
                    <button
                      className="btn-modern btn-danger p-2"
                      title="Remove member"
                      onClick={() => {
                        void onRemoveMember(teamMember);
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="glass-panel p-6 border border-yellow-500/30">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-mono text-yellow-400 mb-2">admin note</h4>
            <p className="text-sm text-text-muted">
              be careful when changing member roles. admins have full access to all system features. you cannot change your own role for security reasons.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
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

  return <span className={`badge ${getBadgeClass()}`}>{role}</span>;
}

function getSpotlightBackground(index: number) {
  switch (index) {
    case 0:
      return "bg-gradient-to-br from-[#f97316] via-[#facc15] to-[#f43f5e]";
    case 1:
      return "bg-gradient-to-br from-white/80 via-white/40 to-transparent";
    case 2:
      return "bg-gradient-to-br from-[#a855f7]/70 via-[#6366f1]/60 to-transparent";
    default:
      return "bg-gradient-to-br from-white/10 to-transparent";
  }
}

function filterMembers(
  list: Doc<"members">[],
  searchTerm: string,
  roleFilter: string
): Doc<"members">[] {
  const normalizedSearch = searchTerm.toLowerCase();
  return list.filter((member) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      member.name.toLowerCase().includes(normalizedSearch) ||
      member.email.toLowerCase().includes(normalizedSearch);
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });
}
