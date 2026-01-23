import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { type Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import {
  Users,
  ShieldCheck,
  Trophy,
  Timer,
  PlusCircle,
  X,
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
import { Button, Tabs, Input, Textarea } from "./ui";

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
      : "No hours tracked yet";
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
      toast.success("Member role updated");
    } catch {
      toast.error("Failed to update member role");
    }
  };

  const handleMemberRemoval = async (targetMember: MemberWithProfile) => {
    if (!confirm(`Remove ${targetMember.name}?`)) return;
    try {
      await deleteMember({ memberId: targetMember._id });
      toast.success("Member removed");
    } catch {
      toast.error("Failed to remove member");
    }
  };

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
      toast.error("Enter a positive number of points");
      return;
    }

    const trimmedReason = awardReason.trim();
    if (!trimmedReason) {
      toast.error("A reason is required");
      return;
    }

    try {
      setIsAwarding(true);
      await awardMuPoint({
        memberId: selectedMemberId,
        points: parsedPoints,
        reason: trimmedReason,
      });
      toast.success("Points awarded!");
      setAwardReason("");
      setAwardPoints("1");
    } catch {
      toast.error("Failed to award points");
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
      toast.success("Bounty posted!");
      return true;
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : "Failed to create bounty";
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
      toast.success("Bounty completed!");
      return true;
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : "Failed to complete bounty";
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
          label: "Leaderboard",
          icon: <Trophy size={16} />,
        },
        {
          key: "directory" as const,
          label: "Directory",
          icon: <Users size={16} />,
        },
        {
          key: "management" as const,
          label: "Admin",
          icon: <ShieldCheck size={16} />,
          restricted: true,
        },
      ].filter((tab) => !tab.restricted || canManageRoles),
    [canManageRoles]
  );

  return (
    <div className="space-y-6 pt-2">
      {/* Header */}
      <section>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Members</h1>
            <p className="text-sm text-text-muted mt-1">
              Team recognition and directory for FRC 7157
            </p>
          </div>
          <div className="flex gap-4 text-center">
            <div className="bg-bg-secondary border border-border rounded-lg px-4 py-2">
              <p className="text-xl font-semibold text-accent-orange">
                {members.length}
              </p>
              <p className="text-xs text-text-muted">Members</p>
            </div>
            <div className="bg-bg-secondary border border-border rounded-lg px-4 py-2">
              <p className="text-xl font-semibold text-accent">
                {formatPoints(leaderboardStats.totalPoints)}
              </p>
              <p className="text-xs text-text-muted">Points</p>
            </div>
            <div className="bg-bg-secondary border border-border rounded-lg px-4 py-2">
              <p className="text-xl font-semibold text-accent-success">
                {totalAttendanceLabel}h
              </p>
              <p className="text-xs text-text-muted">Hours</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          tabs={visibleTabs.map((tab) => ({
            id: tab.key,
            label: tab.label,
          }))}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as TabKey)}
          variant="segment"
        />
      </section>

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

      {/* Member Details Modal */}
      {selectedMemberId && (
        <Modal
          isOpen={selectedMemberId !== null}
          onClose={closeMemberDetails}
          title="Member Details"
          size="lg"
        >
          <div className="space-y-6">
            {/* Member Header */}
            <div className="bg-bg-tertiary rounded-xl p-4">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex items-start gap-4">
                  {selectedMember ? (
                    <ProfileAvatar
                      name={selectedMember.name}
                      imageUrl={selectedMember.profileImageUrl}
                      size="lg"
                      className="ring-2 ring-accent/30"
                    />
                  ) : (
                    <ProfileAvatar
                      name="Team Member"
                      size="lg"
                      className="ring-2 ring-accent/30"
                    />
                  )}
                  <div>
                    <h3 className="text-xl font-semibold text-text-primary">
                      {selectedMember?.name ?? "Team Member"}
                    </h3>
                    {selectedMember?.email && (
                      <p className="text-sm text-text-muted mt-1">
                        {selectedMember.email}
                      </p>
                    )}
                    <p className="text-xs text-text-muted mt-2 flex items-center gap-2">
                      <Timer size={14} className="text-accent-success" />
                      {selectedMemberAttendanceSummary}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-semibold text-accent-orange">
                    +{formatPoints(selectedMemberTotalPoints)}
                  </p>
                  <p className="text-xs text-text-muted">total points</p>
                  <p className="text-xs text-text-muted mt-1">
                    {selectedMemberAwardsCount.toLocaleString()}{" "}
                    {selectedMemberAwardsLabel}
                  </p>
                </div>
              </div>
            </div>

            {/* Award Form */}
            {canAwardPoints && (
              <form
                onSubmit={(event) => {
                  void handleAwardSubmit(event);
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-[120px,1fr] gap-4">
                  <Input
                    label="Points"
                    type="number"
                    min={0}
                    step={0.5}
                    value={awardPoints}
                    onChange={(e) => setAwardPoints(e.target.value)}
                  />
                  <Textarea
                    label="Reason"
                    value={awardReason}
                    onChange={(e) => setAwardReason(e.target.value)}
                    placeholder="Describe why this member earned points..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    loading={isAwarding}
                    icon={<PlusCircle size={16} />}
                  >
                    Award Points
                  </Button>
                </div>
              </form>
            )}

            {/* History */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3">
                Point History
              </h4>
              {isHistoryLoading ? (
                <p className="text-sm text-text-muted">Loading history...</p>
              ) : memberHistory.length === 0 ? (
                <p className="text-sm text-text-muted">
                  {selectedMember?.name ?? "This member"} hasn't received any
                  points yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {memberHistory.map((award) => (
                    <div
                      key={award._id}
                      className="bg-bg-tertiary rounded-lg p-4"
                    >
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                        <div>
                          <p className="text-base font-medium text-accent-orange">
                            +{formatPoints(award.points)} points
                          </p>
                          <p className="text-sm text-text-primary mt-1">
                            {award.reason}
                          </p>
                        </div>
                        <div className="text-right text-xs text-text-muted">
                          <p>{formatHistoryDate(award.createdAt)}</p>
                          <p className="mt-1">
                            by {award.assignedBy.name}
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
