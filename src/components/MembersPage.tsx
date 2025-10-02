import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { type Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import {
  Users,
  ShieldCheck,
  Sparkles,
  PlusCircle,
  Trophy,
  Timer,
} from "lucide-react";
import { Modal } from "./Modal";
import { LeaderboardTab } from "./members/LeaderboardTab";
import { DirectoryTab } from "./members/DirectoryTab";
import { ManagementTab } from "./members/ManagementTab";
import {
  formatAwardDate as formatAwardDateHelper,
  formatPoints as formatPointsHelper,
  filterMembers as filterMembersHelper,
  formatHours as formatHoursHelper,
} from "./members/helpers";
import type {
  BountyBoardData,
  LeaderboardEntry,
  LeaderboardRange,
} from "./members/types";
import { MemberWithProfile } from "../lib/members";
import { ProfileAvatar } from "./ProfileAvatar";

type TabKey = "leaderboard" | "directory" | "management";

interface MembersPageProps {
  member: MemberWithProfile;
}

export function MembersPage({ member }: MembersPageProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("leaderboard");
  const [selectedMemberId, setSelectedMemberId] =
    useState<Id<"members"> | null>(null);
  const [awardPoints, setAwardPoints] = useState("1");
  const [awardReason, setAwardReason] = useState("");
  const [isAwarding, setIsAwarding] = useState(false);
  const [leaderboardRange, setLeaderboardRange] =
    useState<LeaderboardRange>("allTime");

  const [directorySearchTerm, setDirectorySearchTerm] = useState("");
  const [directoryRoleFilter, setDirectoryRoleFilter] = useState<string>("all");
  const [managementSearchTerm, setManagementSearchTerm] = useState("");
  const [managementRoleFilter, setManagementRoleFilter] =
    useState<string>("all");
  const [isCreatingBounty, setIsCreatingBounty] = useState(false);
  const [completingBountyId, setCompletingBountyId] =
    useState<Id<"bounties"> | null>(null);

  const membersQuery = useQuery(api.members.getAllMembers) as
    | MemberWithProfile[]
    | undefined;
  const members = useMemo<MemberWithProfile[]>(
    () => membersQuery ?? [],
    [membersQuery]
  );
  const leaderboardQuery = useQuery(api.members.getLeaderboard, {
    range: leaderboardRange,
  }) as LeaderboardEntry[] | undefined;
  const leaderboard = useMemo(() => leaderboardQuery ?? [], [leaderboardQuery]);
  const isLeaderboardLoading = leaderboardQuery === undefined;
  const totalAttendanceMs = useMemo(
    () =>
      leaderboard.reduce(
        (sum, entry) => sum + entry.totalAttendanceMs,
        0
      ),
    [leaderboard]
  );
  const totalAttendanceLabel = formatHoursHelper(totalAttendanceMs);
  const bountyBoardQuery = useQuery(api.bounties.getBounties) as
    | BountyBoardData
    | undefined;
  const bountyBoard = useMemo(
    () =>
      bountyBoardQuery ??
      ({
        openBounties: [],
        recentlyCompleted: [],
      } as BountyBoardData),
    [bountyBoardQuery]
  );
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
    () =>
      filterMembersHelper(members, directorySearchTerm, directoryRoleFilter),
    [members, directorySearchTerm, directoryRoleFilter]
  );

  const filteredManagementMembers = useMemo(
    () =>
      filterMembersHelper(members, managementSearchTerm, managementRoleFilter),
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
      return {
        totalPoints: 0,
        totalAwards: 0,
        topMemberName: null as string | null,
      };
    }
    const totalPoints = leaderboard.reduce(
      (sum, entry) => sum + entry.totalPoints,
      0
    );
    const totalAwards = leaderboard.reduce(
      (sum, entry) => sum + entry.awardsCount,
      0
    );
    const topMemberName =
      totalAwards > 0 && leaderboard[0] ? leaderboard[0].name : null;
    return { totalPoints, totalAwards, topMemberName };
  }, [leaderboard]);

  const selectedMember = selectedMemberId
    ? (members.find((m) => m._id === selectedMemberId) ?? null)
    : null;

  const selectedMemberLeaderboardEntry = selectedMemberId
    ? leaderboard.find((entry) => entry.memberId === selectedMemberId)
    : undefined;

  const selectedMemberAwardsCount =
    selectedMemberLeaderboardEntry?.awardsCount ?? 0;
  const selectedMemberTotalPoints =
    selectedMemberLeaderboardEntry?.totalPoints ?? 0;
  const selectedMemberAttendanceMs =
    selectedMemberLeaderboardEntry?.totalAttendanceMs ?? 0;
  const selectedMemberAttendanceMeetings =
    selectedMemberLeaderboardEntry?.attendanceMeetingsCount ?? 0;
  const selectedMemberAttendanceSessions =
    selectedMemberLeaderboardEntry?.attendanceSessionCount ?? 0;
  const selectedMemberAttendanceLabel = formatHoursHelper(
    selectedMemberAttendanceMs
  );
  const selectedMemberAttendanceSummary =
    selectedMemberAttendanceMs > 0
      ? `${selectedMemberAttendanceLabel} hours across ${selectedMemberAttendanceMeetings.toLocaleString()} ${
          selectedMemberAttendanceMeetings === 1 ? "meeting" : "meetings"
        } • ${selectedMemberAttendanceSessions.toLocaleString()} ${
          selectedMemberAttendanceSessions === 1 ? "check-in" : "check-ins"
        }`
      : "no hours tracked just yet";
  const selectedMemberAwardsLabel =
    selectedMemberAwardsCount === 1 ? "award" : "awards";

  const isHistoryLoading =
    selectedMemberId !== null && selectedMemberPoints === undefined;
  const memberHistory = selectedMemberPoints ?? [];

  const handleRoleChange = async (
    memberId: Id<"members">,
    newRole: "admin" | "lead" | "member"
  ) => {
    try {
      await updateMemberRole({ memberId, newRole });
      toast.success("member role updated successfully");
    } catch {
      toast.error("failed to update member role");
    }
  };

  const handleMemberRemoval = async (targetMember: MemberWithProfile) => {
    if (!confirm(`Remove ${targetMember.name}?`)) return;
    try {
      await deleteMember({ memberId: targetMember._id });
      toast.success("member removed");
    } catch {
      toast.error("failed to remove member");
    }
  };

  // formatJoinDate no longer needed here; subcomponents format internally

  const formatAwardDate = (timestamp: number | null) =>
    formatAwardDateHelper(timestamp);

  const formatHistoryDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatPoints = (value: number) => formatPointsHelper(value);

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
    } catch {
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
    [
      "px-4 py-2 rounded-xl text-xs font-mono tracking-widest uppercase transition",
      "border flex items-center gap-2 backdrop-blur-sm",
      "shadow-sm hover:shadow-md",
      activeTab === tabKey
        ? "bg-gradient-to-r from-sunset-orange to-accent-purple text-void-black border-transparent shadow-[0_12px_32px_rgba(249,115,22,0.35)]"
        : "bg-glass border-border-glass text-text-muted hover:text-text-primary",
    ].join(" ");

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden glass-panel p-8">
        <div className="absolute -top-24 -left-12 h-48 w-48 rounded-full bg-gradient-to-br from-sunset-orange/40 via-amber-400/30 to-transparent blur-3xl" />
        <div className="absolute -bottom-16 -right-10 h-52 w-52 rounded-full bg-gradient-to-br from-accent-purple/40 via-pink-500/30 to-transparent blur-3xl" />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
            <div>
              <div className="flex items-center gap-2 text-text-primary">
                <Sparkles
                  size={18}
                  className="text-sunset-orange animate-pulse"
                />
                <h1 className="text-3xl font-light">team members</h1>
              </div>
              <p className="text-text-muted mt-2">
                celebrate wins, stay organized, and keep frc team 7157 buzzing.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 text-center">
              <div>
                <p className="text-3xl font-light text-sunset-orange">
                  {members.length}
                </p>
                <p className="text-xs text-text-dim uppercase tracking-widest">
                  humans
                </p>
              </div>
              <div>
                <p className="text-3xl font-light text-accent-purple">
                  {formatPoints(leaderboardStats.totalPoints)}
                </p>
                <p className="text-xs text-text-dim uppercase tracking-widest">
                  μpoints
                </p>
              </div>
              <div>
                <p className="text-3xl font-light text-emerald-300">
                  {totalAttendanceLabel}h
                </p>
                <p className="text-xs text-text-dim uppercase tracking-widest">
                  hours tracked
                </p>
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
          leaderboardRange={leaderboardRange}
          onSelectRange={setLeaderboardRange}
          onSelectMember={openMemberDetails}
          currentMemberId={member._id}
          isLoading={isLeaderboardLoading}
          formatPoints={formatPoints}
          formatAwardDate={formatAwardDate}
          formatHours={formatHoursHelper}
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
                <div className="flex items-start gap-4">
                  {selectedMember ? (
                    <ProfileAvatar
                      name={selectedMember.name}
                      imageUrl={selectedMember.profileImageUrl}
                      size="lg"
                      className="border-2 border-sunset-orange/40"
                    />
                  ) : (
                    <ProfileAvatar
                      name="team member"
                      size="lg"
                      className="border-2 border-sunset-orange/40"
                    />
                  )}
                  <div>
                    <h3 className="text-2xl font-light text-text-primary">
                      {selectedMember?.name ?? "team member"}
                    </h3>
                    {selectedMember?.email && (
                      <p className="text-sm text-text-muted mt-1">
                        {selectedMember.email}
                      </p>
                    )}
                    <p className="text-xs text-text-muted mt-3 flex items-center gap-2">
                      <Timer size={14} className="text-emerald-300" />
                      {selectedMemberAttendanceSummary}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-light text-sunset-orange">
                    +{formatPoints(selectedMemberTotalPoints)}
                  </p>
                  <p className="text-xs text-text-dim uppercase tracking-widest">
                    total μpoints
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    {selectedMemberAwardsCount.toLocaleString()}{" "}
                    {selectedMemberAwardsLabel}
                  </p>
                </div>
              </div>
            </div>

            {canAwardPoints && (
              <form
                onSubmit={(event) => {
                  void handleAwardSubmit(event);
                }}
                className="space-y-4"
              >
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
                  {selectedMember?.name ?? "this member"} hasn't received any
                  μpoints yet.
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
                          <p className="text-sm text-text-primary mt-2">
                            {award.reason}
                          </p>
                        </div>
                        <div className="text-right text-xs text-text-dim">
                          <p>{formatHistoryDate(award.createdAt)}</p>
                          <p className="mt-1 text-text-muted">
                            awarded by {award.assignedBy.name}
                            {award.assignedBy.memberId === member._id
                              ? " (you)"
                              : ""}
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
