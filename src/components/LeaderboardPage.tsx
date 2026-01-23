import { useMemo, useState, type FormEvent } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { type Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { MemberWithProfile } from "../lib/members";
import { Modal } from "./Modal";
import { ProfileAvatar } from "./ProfileAvatar";
import { Button, Badge, Tabs, Input, Textarea, SearchInput } from "./ui";
import { cn } from "../lib/utils";
import {
  Trophy,
  Clock,
  Crown,
  Medal,
  Award,
  Target,
  Sparkles,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Plus,
  User,
  Calendar,
  Flame,
  PlusCircle,
  Search,
} from "lucide-react";
import {
  formatPoints as formatPointsHelper,
  formatHours as formatHoursHelper,
  formatDateTime,
} from "./members/helpers";
import type {
  BountyBoardData,
  LeaderboardEntry,
  LeaderboardRange,
  BountyEntry,
} from "./members/types";
import { CreateBountyModal, CompleteBountyModal } from "./members/leaderboard";

interface LeaderboardPageProps {
  member: MemberWithProfile;
}

type TabKey = "rankings" | "bounties";
type ViewMode = "points" | "hours";
type BountyView = "open" | "completed";

const rangeOptions: { value: LeaderboardRange; label: string }[] = [
  { value: "allTime", label: "All Time" },
  { value: "lastMonth", label: "Month" },
  { value: "lastWeek", label: "Week" },
];

export function LeaderboardPage({ member }: LeaderboardPageProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("rankings");
  const [leaderboardRange, setLeaderboardRange] = useState<LeaderboardRange>("allTime");
  const [viewMode, setViewMode] = useState<ViewMode>("points");
  const [bountyView, setBountyView] = useState<BountyView>("open");
  const [bountySearchTerm, setBountySearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedBounty, setSelectedBounty] = useState<BountyEntry | null>(null);
  const [expandedBountyId, setExpandedBountyId] = useState<Id<"bounties"> | null>(null);
  const [isCreatingBounty, setIsCreatingBounty] = useState(false);
  const [completingBountyId, setCompletingBountyId] = useState<Id<"bounties"> | null>(null);

  // Member details modal state
  const [selectedMemberId, setSelectedMemberId] = useState<Id<"members"> | null>(null);
  const [awardPoints, setAwardPoints] = useState("1");
  const [awardReason, setAwardReason] = useState("");
  const [isAwarding, setIsAwarding] = useState(false);

  // Queries
  const membersQuery = useQuery(api.members.getAllMembers) as MemberWithProfile[] | undefined;
  const members = useMemo(() => membersQuery ?? [], [membersQuery]);

  const leaderboardQuery = useQuery(api.members.getLeaderboard, {
    range: leaderboardRange,
  }) as LeaderboardEntry[] | undefined;
  const leaderboard = useMemo(() => leaderboardQuery ?? [], [leaderboardQuery]);
  const isLeaderboardLoading = leaderboardQuery === undefined;

  const bountyBoardQuery = useQuery(api.bounties.getBounties) as BountyBoardData | undefined;
  const bountyBoard = useMemo(
    () => bountyBoardQuery ?? { openBounties: [], recentlyCompleted: [] },
    [bountyBoardQuery]
  );

  const selectedMemberPoints = useQuery(
    api.members.getMemberMuPoints,
    selectedMemberId ? { memberId: selectedMemberId } : "skip"
  );

  // Mutations
  const awardMuPoint = useMutation(api.members.awardMuPoint);
  const createBounty = useMutation(api.bounties.createBounty);
  const completeBounty = useMutation(api.bounties.completeBounty);

  const canAwardPoints = member.role === "admin" || member.role === "lead";
  const canManageBounties = canAwardPoints;

  // Leaderboard calculations
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

  const stats = useMemo(() => {
    const totalPoints = leaderboard.reduce((sum, e) => sum + e.totalPoints, 0);
    const totalHours = leaderboard.reduce((sum, e) => sum + e.totalAttendanceMs, 0);
    return { totalPoints, totalHours };
  }, [leaderboard]);

  const myRank = useMemo(() => {
    const index = sortedLeaderboard.findIndex((e) => e.memberId === member._id);
    return index >= 0 ? index + 1 : null;
  }, [sortedLeaderboard, member._id]);

  const myEntry = sortedLeaderboard.find((e) => e.memberId === member._id);

  const getMetricValue = (entry: LeaderboardEntry) => {
    if (viewMode === "hours") {
      return `${formatHoursHelper(entry.totalAttendanceMs)}h`;
    }
    return formatPointsHelper(entry.totalPoints);
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

  // Bounty calculations
  const totalOpenPoints = bountyBoard.openBounties.reduce((sum, b) => sum + b.points, 0);
  const totalCompletedPoints = bountyBoard.recentlyCompleted.reduce((sum, b) => sum + b.points, 0);

  const filteredOpenBounties = useMemo(() => {
    if (!bountySearchTerm.trim()) return bountyBoard.openBounties;
    const term = bountySearchTerm.toLowerCase();
    return bountyBoard.openBounties.filter(
      (b) =>
        b.title.toLowerCase().includes(term) ||
        b.description?.toLowerCase().includes(term) ||
        b.createdBy.name.toLowerCase().includes(term)
    );
  }, [bountyBoard.openBounties, bountySearchTerm]);

  const filteredCompletedBounties = useMemo(() => {
    if (!bountySearchTerm.trim()) return bountyBoard.recentlyCompleted;
    const term = bountySearchTerm.toLowerCase();
    return bountyBoard.recentlyCompleted.filter(
      (b) =>
        b.title.toLowerCase().includes(term) ||
        b.description?.toLowerCase().includes(term) ||
        b.completedBy?.name.toLowerCase().includes(term)
    );
  }, [bountyBoard.recentlyCompleted, bountySearchTerm]);

  // Selected member data
  const selectedMember = selectedMemberId
    ? members.find((m) => m._id === selectedMemberId) ?? null
    : null;

  const selectedMemberLeaderboardEntry = selectedMemberId
    ? leaderboard.find((entry) => entry.memberId === selectedMemberId)
    : undefined;

  const selectedMemberTotalPoints = selectedMemberLeaderboardEntry?.totalPoints ?? 0;
  const selectedMemberAttendanceMs = selectedMemberLeaderboardEntry?.totalAttendanceMs ?? 0;
  const selectedMemberAttendanceLabel = formatHoursHelper(selectedMemberAttendanceMs);

  const isHistoryLoading = selectedMemberId !== null && selectedMemberPoints === undefined;
  const memberHistory = selectedMemberPoints ?? [];

  // Handlers
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
      await createBounty({
        title: input.title.trim(),
        description: input.description?.trim() || undefined,
        points: input.points,
      });
      toast.success("Bounty posted!");
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create bounty";
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
      await completeBounty({
        bountyId: input.bountyId,
        completedByMemberId: input.memberId,
        completionNotes: input.notes?.trim() || undefined,
      });
      toast.success("Bounty completed!");
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to complete bounty";
      toast.error(message);
      return false;
    } finally {
      setCompletingBountyId(null);
    }
  };

  const formatHistoryDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const tabs = [
    { id: "rankings" as const, label: "Rankings", icon: <Trophy size={16} /> },
    {
      id: "bounties" as const,
      label: "Bounties",
      icon: <Target size={16} />,
      count: bountyBoard.openBounties.length || undefined,
    },
  ];

  return (
    <div className="space-y-6 pt-2">
      {/* Header */}
      <section>
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-text-primary">Leaderboard</h1>
          <p className="text-sm text-text-muted mt-1">
            Earn points, climb the ranks, complete bounties
          </p>
        </div>

        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as TabKey)}
          variant="segment"
        />
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-bg-secondary border border-border rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-accent-orange mb-1">
            <Trophy size={16} />
            <span className="text-xl font-semibold">{formatPointsHelper(stats.totalPoints)}</span>
          </div>
          <p className="text-xs text-text-muted">Total Points</p>
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-accent-success mb-1">
            <Clock size={16} />
            <span className="text-xl font-semibold">{formatHoursHelper(stats.totalHours)}h</span>
          </div>
          <p className="text-xs text-text-muted">Total Hours</p>
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-accent mb-1">
            <Target size={16} />
            <span className="text-xl font-semibold">{bountyBoard.openBounties.length}</span>
          </div>
          <p className="text-xs text-text-muted">Open Bounties</p>
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-accent-warning mb-1">
            <Sparkles size={16} />
            <span className="text-xl font-semibold">{formatPointsHelper(totalOpenPoints)}</span>
          </div>
          <p className="text-xs text-text-muted">Available Points</p>
        </div>
      </div>

      {/* Rankings Tab */}
      {activeTab === "rankings" && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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

            <div className="flex rounded-lg border border-border overflow-hidden bg-bg-tertiary">
              {rangeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setLeaderboardRange(option.value)}
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

          {isLeaderboardLoading ? (
            <div className="bg-bg-secondary border border-border rounded-xl p-8 text-center">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-bg-tertiary rounded w-48 mx-auto" />
                <div className="h-4 bg-bg-tertiary rounded w-64 mx-auto" />
              </div>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="bg-bg-secondary border border-border rounded-xl p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto mb-4">
                <Trophy size={32} className="text-text-muted" />
              </div>
              <h3 className="text-lg font-medium text-text-primary mb-2">No rankings yet</h3>
              <p className="text-sm text-text-muted">
                Start earning points to appear on the leaderboard!
              </p>
            </div>
          ) : (
            <>
              {/* Your Rank Card */}
              {myRank && myRank > 3 && myEntry && (
                <button
                  onClick={() => openMemberDetails(member._id)}
                  className="w-full bg-accent/10 border border-accent/30 rounded-xl p-4 text-left hover:bg-accent/15 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center text-accent font-semibold">
                      #{myRank}
                    </div>
                    <ProfileAvatar name={myEntry.name} imageUrl={myEntry.profileImageUrl} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary">{myEntry.name}</span>
                        <Badge variant="accent" size="sm">You</Badge>
                      </div>
                      <p className="text-sm text-text-muted">{getMetricValue(myEntry)}</p>
                    </div>
                    <ChevronRight size={16} className="text-accent" />
                  </div>
                </button>
              )}

              {/* Podium */}
              {topThree.length > 0 && (
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="order-1">
                    {topThree[1] && (
                      <PodiumCard
                        entry={topThree[1]}
                        rank={2}
                        viewMode={viewMode}
                        formatValue={getMetricValue}
                        isYou={topThree[1].memberId === member._id}
                        onSelect={() => openMemberDetails(topThree[1].memberId)}
                        className="mt-6"
                      />
                    )}
                  </div>
                  <div className="order-2">
                    {topThree[0] && (
                      <PodiumCard
                        entry={topThree[0]}
                        rank={1}
                        viewMode={viewMode}
                        formatValue={getMetricValue}
                        isYou={topThree[0].memberId === member._id}
                        onSelect={() => openMemberDetails(topThree[0].memberId)}
                      />
                    )}
                  </div>
                  <div className="order-3">
                    {topThree[2] && (
                      <PodiumCard
                        entry={topThree[2]}
                        rank={3}
                        viewMode={viewMode}
                        formatValue={getMetricValue}
                        isYou={topThree[2].memberId === member._id}
                        onSelect={() => openMemberDetails(topThree[2].memberId)}
                        className="mt-8"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Rest of leaderboard */}
              {rest.length > 0 && (
                <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
                  <div className="divide-y divide-border-subtle">
                    {rest.map((entry, index) => {
                      const rank = index + 4;
                      const isYou = entry.memberId === member._id;
                      const progress = getProgress(entry);

                      return (
                        <button
                          key={entry.memberId}
                          onClick={() => openMemberDetails(entry.memberId)}
                          className={cn(
                            "w-full text-left p-4 transition-colors hover:bg-bg-tertiary flex items-center gap-4",
                            isYou && "bg-accent/5"
                          )}
                        >
                          <div className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center text-sm font-medium text-text-muted shrink-0">
                            {rank}
                          </div>
                          <ProfileAvatar name={entry.name} imageUrl={entry.profileImageUrl} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-text-primary truncate">{entry.name}</span>
                              {isYou && <Badge variant="accent" size="sm">You</Badge>}
                            </div>
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
                          <span
                            className={cn(
                              "text-lg font-semibold shrink-0",
                              viewMode === "points" ? "text-accent-orange" : "text-accent-success"
                            )}
                          >
                            {getMetricValue(entry)}
                          </span>
                          <ChevronRight size={16} className="text-text-muted shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {canAwardPoints && (
            <p className="text-xs text-text-muted text-center">
              Tap any member to view history or award points
            </p>
          )}
        </div>
      )}

      {/* Bounties Tab */}
      {activeTab === "bounties" && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex rounded-lg border border-border overflow-hidden bg-bg-tertiary">
              <button
                onClick={() => setBountyView("open")}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2",
                  bountyView === "open"
                    ? "bg-accent text-white"
                    : "text-text-muted hover:text-text-primary"
                )}
              >
                <Target size={14} />
                Open
                {bountyBoard.openBounties.length > 0 && (
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-full text-xs",
                    bountyView === "open" ? "bg-white/20" : "bg-bg-secondary"
                  )}>
                    {bountyBoard.openBounties.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setBountyView("completed")}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2",
                  bountyView === "completed"
                    ? "bg-accent text-white"
                    : "text-text-muted hover:text-text-primary"
                )}
              >
                <CheckCircle2 size={14} />
                Completed
                {bountyBoard.recentlyCompleted.length > 0 && (
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-full text-xs",
                    bountyView === "completed" ? "bg-white/20" : "bg-bg-secondary"
                  )}>
                    {bountyBoard.recentlyCompleted.length}
                  </span>
                )}
              </button>
            </div>

            <SearchInput
              placeholder="Search bounties..."
              value={bountySearchTerm}
              onChange={(e) => setBountySearchTerm(e.target.value)}
              onClear={() => setBountySearchTerm("")}
              className="flex-1"
            />

            {canManageBounties && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus size={16} />}
                onClick={() => setIsCreateModalOpen(true)}
              >
                Post Bounty
              </Button>
            )}
          </div>

          {/* Open Bounties */}
          {bountyView === "open" && (
            filteredOpenBounties.length === 0 ? (
              <div className="bg-bg-secondary border border-border rounded-xl p-12 text-center">
                {bountyBoard.openBounties.length === 0 ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto mb-4">
                      <Target size={32} className="text-text-muted" />
                    </div>
                    <h3 className="text-lg font-medium text-text-primary mb-2">No bounties yet</h3>
                    <p className="text-sm text-text-muted mb-4">
                      Bounties are tasks that earn team members points when completed.
                    </p>
                    {canManageBounties && (
                      <Button variant="primary" icon={<Plus size={16} />} onClick={() => setIsCreateModalOpen(true)}>
                        Create First Bounty
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Search size={24} className="text-text-muted mx-auto mb-3" />
                    <p className="text-sm text-text-muted">No bounties match "{bountySearchTerm}"</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOpenBounties.map((bounty) => {
                  const isExpanded = expandedBountyId === bounty._id;
                  return (
                    <div key={bounty._id} className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedBountyId(isExpanded ? null : bounty._id)}
                        className={cn(
                          "w-full text-left p-4 transition-colors hover:bg-bg-tertiary",
                          isExpanded && "bg-bg-tertiary"
                        )}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent-orange/10 border border-accent-orange/20 shrink-0">
                            <Sparkles size={16} className="text-accent-orange" />
                            <span className="text-lg font-semibold text-accent-orange">
                              +{formatPointsHelper(bounty.points)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-text-primary">{bounty.title}</h3>
                            {bounty.description && (
                              <p className="text-sm text-text-muted mt-1 line-clamp-2">{bounty.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                              <span className="flex items-center gap-1">
                                <User size={12} />
                                {bounty.createdBy.name}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar size={12} />
                                {formatDateTime(bounty.createdAt)}
                              </span>
                            </div>
                          </div>
                          <ChevronDown
                            size={16}
                            className={cn("text-text-muted transition-transform shrink-0", isExpanded && "rotate-180")}
                          />
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4">
                          <div className="bg-bg-primary rounded-lg p-4 border border-border-subtle">
                            {bounty.description ? (
                              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                                {bounty.description}
                              </p>
                            ) : (
                              <p className="text-sm text-text-muted italic">No additional details provided.</p>
                            )}
                            {canManageBounties && (
                              <div className="flex justify-end mt-4 pt-4 border-t border-border-subtle">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  icon={<CheckCircle2 size={16} />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedBounty(bounty);
                                  }}
                                >
                                  Mark Complete
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Completed Bounties */}
          {bountyView === "completed" && (
            filteredCompletedBounties.length === 0 ? (
              <div className="bg-bg-secondary border border-border rounded-xl p-12 text-center">
                {bountyBoard.recentlyCompleted.length === 0 ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto mb-4">
                      <Award size={32} className="text-text-muted" />
                    </div>
                    <h3 className="text-lg font-medium text-text-primary mb-2">No completed bounties yet</h3>
                    <p className="text-sm text-text-muted">Completed bounties will appear here.</p>
                  </>
                ) : (
                  <>
                    <Search size={24} className="text-text-muted mx-auto mb-3" />
                    <p className="text-sm text-text-muted">No completed bounties match "{bountySearchTerm}"</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCompletedBounties.map((bounty) => (
                  <div key={bounty._id} className="bg-bg-secondary border border-border rounded-xl p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent-success/10 border border-accent-success/20 shrink-0">
                        <CheckCircle2 size={16} className="text-accent-success" />
                        <span className="text-lg font-semibold text-accent-success">
                          +{formatPointsHelper(bounty.points)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-text-primary">{bounty.title}</h3>
                        {bounty.completionNotes && (
                          <p className="text-sm text-text-muted mt-1">{bounty.completionNotes}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-text-muted">
                          {bounty.completedBy && (
                            <span className="flex items-center gap-1.5 text-accent-success">
                              <Trophy size={12} />
                              Completed by {bounty.completedBy.name}
                            </span>
                          )}
                          {bounty.completedAt && (
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {formatDateTime(bounty.completedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* Modals */}
      <CreateBountyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateBounty}
        isCreating={isCreatingBounty}
      />

      <CompleteBountyModal
        bounty={selectedBounty}
        members={members}
        onClose={() => setSelectedBounty(null)}
        onComplete={handleCompleteBounty}
        completingBountyId={completingBountyId}
        formatPoints={formatPointsHelper}
      />

      {/* Member Details Modal */}
      {selectedMemberId && (
        <Modal isOpen={selectedMemberId !== null} onClose={closeMemberDetails} title="Member Profile" size="lg">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <ProfileAvatar
                name={selectedMember?.name ?? "Member"}
                imageUrl={selectedMember?.profileImageUrl}
                size="xl"
                className="ring-2 ring-accent/30 mx-auto sm:mx-0"
              />
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
                  <p className="text-sm text-text-muted mt-1">{selectedMember.email}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-accent-orange/10 border border-accent-orange/20 rounded-xl p-4 text-center">
                <p className="text-2xl font-semibold text-accent-orange">
                  {formatPointsHelper(selectedMemberTotalPoints)}
                </p>
                <p className="text-xs text-text-muted mt-1">Total Points</p>
              </div>
              <div className="bg-accent-success/10 border border-accent-success/20 rounded-xl p-4 text-center">
                <p className="text-2xl font-semibold text-accent-success">{selectedMemberAttendanceLabel}h</p>
                <p className="text-xs text-text-muted mt-1">Hours Logged</p>
              </div>
            </div>

            {canAwardPoints && (
              <form onSubmit={(e) => void handleAwardSubmit(e)} className="bg-bg-tertiary rounded-xl p-4 space-y-4">
                <h4 className="text-sm font-medium text-text-primary">Award Points</h4>
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
                  <Button type="submit" variant="primary" loading={isAwarding} icon={<PlusCircle size={16} />}>
                    Award Points
                  </Button>
                </div>
              </form>
            )}

            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3">Point History</h4>
              {isHistoryLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-bg-tertiary rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : memberHistory.length === 0 ? (
                <div className="bg-bg-tertiary rounded-lg p-6 text-center">
                  <Trophy size={24} className="text-text-muted mx-auto mb-2" />
                  <p className="text-sm text-text-muted">No points awarded yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {memberHistory.map((award) => (
                    <div key={award._id} className="bg-bg-tertiary rounded-lg p-3 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-accent-orange">+{formatPointsHelper(award.points)}</span>
                          <span className="text-xs text-text-muted">
                            by {award.assignedBy.name}
                            {award.assignedBy.memberId === member._id ? " (you)" : ""}
                          </span>
                        </div>
                        <p className="text-sm text-text-secondary mt-1 line-clamp-2">{award.reason}</p>
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

function PodiumCard({ entry, rank, viewMode, formatValue, isYou, onSelect, className }: PodiumCardProps) {
  const config = {
    1: { icon: Crown, color: "text-accent-orange", bg: "bg-accent-orange/10", border: "border-accent-orange/30", ring: "ring-accent-orange/50" },
    2: { icon: Medal, color: "text-zinc-300", bg: "bg-zinc-500/10", border: "border-zinc-400/30", ring: "ring-zinc-400/50" },
    3: { icon: Award, color: "text-amber-600", bg: "bg-amber-600/10", border: "border-amber-600/30", ring: "ring-amber-600/50" },
  }[rank];

  const IconComponent = config.icon;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex flex-col items-center p-4 rounded-xl border transition-all",
        "hover:scale-[1.02] active:scale-[0.98]",
        config.bg, config.border, className
      )}
    >
      <div className={cn("mb-2", config.color)}>
        <IconComponent size={rank === 1 ? 28 : 22} />
      </div>
      <ProfileAvatar name={entry.name} imageUrl={entry.profileImageUrl} size={rank === 1 ? "lg" : "md"} className={cn("ring-2 mb-2", config.ring)} />
      <div className="flex items-center gap-1 mb-1">
        <span className="font-medium text-text-primary text-sm truncate max-w-[80px]">{entry.name.split(" ")[0]}</span>
        {isYou && <span className="text-[10px] text-accent bg-accent/10 px-1 rounded">You</span>}
      </div>
      <span className={cn("text-lg font-semibold", viewMode === "points" ? "text-accent-orange" : "text-accent-success")}>
        {formatValue(entry)}
      </span>
    </button>
  );
}
