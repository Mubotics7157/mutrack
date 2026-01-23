import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { type Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import {
  Users,
  ShieldCheck,
  Trophy,
  Target,
  PlusCircle,
} from "lucide-react";
import { Modal } from "./Modal";
import { TeamTab } from "./members/TeamTab";
import { RecognitionTab } from "./members/RecognitionTab";
import { BountiesTab } from "./members/BountiesTab";
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
import { Button, Tabs, Input, Textarea, Badge } from "./ui";
import { Clock } from "lucide-react";

type TabKey = "team" | "recognition" | "bounties" | "management";

interface MembersPageProps {
  member: MemberWithProfile;
}

export function MembersPage({ member }: MembersPageProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("team");
  const [selectedMemberId, setSelectedMemberId] =
    useState<Id<"members"> | null>(null);
  const [awardPoints, setAwardPoints] = useState("1");
  const [awardReason, setAwardReason] = useState("");
  const [isAwarding, setIsAwarding] = useState(false);
  const [leaderboardRange, setLeaderboardRange] =
    useState<LeaderboardRange>("allTime");

  const [teamSearchTerm, setTeamSearchTerm] = useState("");
  const [teamRoleFilter, setTeamRoleFilter] = useState<string>("all");
  const [managementSearchTerm, setManagementSearchTerm] = useState("");
  const [managementRoleFilter, setManagementRoleFilter] = useState<string>("all");
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
      setActiveTab("team");
    }
  }, [activeTab, canManageRoles]);

  const filteredManagementMembers = useMemo(
    () =>
      filterMembersHelper(members, managementSearchTerm, managementRoleFilter),
    [members, managementSearchTerm, managementRoleFilter]
  );

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
      ? `${selectedMemberAttendanceLabel}h across ${selectedMemberAttendanceMeetings.toLocaleString()} ${
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
          key: "team" as const,
          label: "Team",
          icon: <Users size={16} />,
        },
        {
          key: "recognition" as const,
          label: "Recognition",
          icon: <Trophy size={16} />,
        },
        {
          key: "bounties" as const,
          label: "Bounties",
          icon: <Target size={16} />,
          count: bountyBoard.openBounties.length || undefined,
        },
        {
          key: "management" as const,
          label: "Admin",
          icon: <ShieldCheck size={16} />,
          restricted: true,
        },
      ].filter((tab) => !tab.restricted || canManageRoles),
    [canManageRoles, bountyBoard.openBounties.length]
  );

  return (
    <div className="space-y-6 pt-2">
      {/* Header */}
      <section>
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-text-primary">Members</h1>
          <p className="text-sm text-text-muted mt-1">
            {members.length} team members • FRC 7157
          </p>
        </div>

        {/* Tabs */}
        <Tabs
          tabs={visibleTabs.map((tab) => ({
            id: tab.key,
            label: tab.label,
            icon: tab.icon,
            count: tab.count,
          }))}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as TabKey)}
          variant="segment"
        />
      </section>

      {activeTab === "team" && (
        <TeamTab
          members={members}
          leaderboard={leaderboard}
          searchTerm={teamSearchTerm}
          onSearchTermChange={setTeamSearchTerm}
          roleFilter={teamRoleFilter}
          onRoleFilterChange={setTeamRoleFilter}
          currentMemberId={member._id}
          onSelectMember={openMemberDetails}
          formatPoints={formatPoints}
          formatHours={formatHoursHelper}
        />
      )}

      {activeTab === "recognition" && (
        <RecognitionTab
          leaderboard={leaderboard}
          leaderboardRange={leaderboardRange}
          onSelectRange={setLeaderboardRange}
          onSelectMember={openMemberDetails}
          currentMemberId={member._id}
          isLoading={isLeaderboardLoading}
          formatPoints={formatPoints}
          formatHours={formatHoursHelper}
          canAwardPoints={canAwardPoints}
        />
      )}

      {activeTab === "bounties" && (
        <BountiesTab
          bountyBoard={bountyBoard}
          members={members}
          canManageBounties={canManageBounties}
          formatPoints={formatPoints}
          onCreateBounty={handleCreateBounty}
          onCompleteBounty={handleCompleteBounty}
          isCreatingBounty={isCreatingBounty}
          completingBountyId={completingBountyId}
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
          title="Member Profile"
          size="lg"
        >
          <div className="space-y-6">
            {/* Member Header */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              {selectedMember ? (
                <ProfileAvatar
                  name={selectedMember.name}
                  imageUrl={selectedMember.profileImageUrl}
                  size="xl"
                  className="ring-2 ring-accent/30 mx-auto sm:mx-0"
                />
              ) : (
                <ProfileAvatar
                  name="Team Member"
                  size="xl"
                  className="ring-2 ring-accent/30 mx-auto sm:mx-0"
                />
              )}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <h3 className="text-xl font-semibold text-text-primary">
                    {selectedMember?.name ?? "Team Member"}
                  </h3>
                  {selectedMember && (
                    <Badge
                      variant={
                        selectedMember.role === "admin"
                          ? "error"
                          : selectedMember.role === "lead"
                          ? "warning"
                          : "default"
                      }
                    >
                      {selectedMember.role}
                    </Badge>
                  )}
                </div>
                {selectedMember?.email && (
                  <p className="text-sm text-text-muted mt-1">
                    {selectedMember.email}
                  </p>
                )}
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 text-xs text-text-muted">
                  <Clock size={14} className="text-accent-success" />
                  {selectedMemberAttendanceSummary}
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-accent-orange/10 border border-accent-orange/20 rounded-xl p-4 text-center">
                <p className="text-2xl font-semibold text-accent-orange">
                  {formatPoints(selectedMemberTotalPoints)}
                </p>
                <p className="text-xs text-text-muted mt-1">Total Points</p>
              </div>
              <div className="bg-accent-success/10 border border-accent-success/20 rounded-xl p-4 text-center">
                <p className="text-2xl font-semibold text-accent-success">
                  {selectedMemberAttendanceLabel}h
                </p>
                <p className="text-xs text-text-muted mt-1">Hours Logged</p>
              </div>
            </div>

            {/* Award Form */}
            {canAwardPoints && (
              <form
                onSubmit={(event) => {
                  void handleAwardSubmit(event);
                }}
                className="bg-bg-tertiary rounded-xl p-4 space-y-4"
              >
                <h4 className="text-sm font-medium text-text-primary">
                  Award Points
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-[100px,1fr] gap-3">
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
                    placeholder="Why are you awarding these points?"
                    rows={2}
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
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 bg-bg-tertiary rounded-lg animate-pulse"
                    />
                  ))}
                </div>
              ) : memberHistory.length === 0 ? (
                <div className="bg-bg-tertiary rounded-lg p-6 text-center">
                  <Trophy size={24} className="text-text-muted mx-auto mb-2" />
                  <p className="text-sm text-text-muted">
                    No points awarded yet
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {memberHistory.map((award) => (
                    <div
                      key={award._id}
                      className="bg-bg-tertiary rounded-lg p-3 flex items-start justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-accent-orange">
                            +{formatPoints(award.points)}
                          </span>
                          <span className="text-xs text-text-muted">
                            by {award.assignedBy.name}
                            {award.assignedBy.memberId === member._id
                              ? " (you)"
                              : ""}
                          </span>
                        </div>
                        <p className="text-sm text-text-secondary mt-1 line-clamp-2">
                          {award.reason}
                        </p>
                      </div>
                      <span className="text-xs text-text-muted whitespace-nowrap">
                        {formatHistoryDate(award.createdAt)}
                      </span>
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
