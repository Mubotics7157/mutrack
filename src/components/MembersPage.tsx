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
  Sparkles,
  Users2,
  Crown,
  Medal,
} from "lucide-react";
import { Modal } from "./Modal";

interface MembersPageProps {
  member: Doc<"members">;
}

type LeaderboardEntry = {
  memberId: Id<"members">;
  name: string;
  email: string;
  role: Doc<"members">["role"];
  totalPoints: number;
  awardsCount: number;
  lastAwardedAt: number | null;
};

export function MembersPage({ member }: MembersPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"leaderboard" | "management">(
    "leaderboard"
  );
  const [selectedMemberId, setSelectedMemberId] =
    useState<Id<"members"> | null>(null);
  const [awardPoints, setAwardPoints] = useState("1");
  const [awardReason, setAwardReason] = useState("");
  const [isAwarding, setIsAwarding] = useState(false);

  const members = useQuery(api.members.getAllMembers) || [];
  const leaderboard =
    (useQuery(api.members.getLeaderboard) as LeaderboardEntry[] | undefined) ||
    [];
  const selectedMemberPoints = useQuery(
    api.members.getMemberMuPoints,
    selectedMemberId ? { memberId: selectedMemberId } : "skip"
  );

  const updateMemberRole = useMutation(api.members.updateMemberRole);
  const deleteMember = useMutation(api.members.deleteMember);
  const awardMuPoint = useMutation(api.members.awardMuPoint);

  const canManageRoles = member.role === "admin";
  const canAwardPoints =
    member.role === "admin" || member.role === "lead";

  const filteredMembers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return members.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(term) ||
        m.email.toLowerCase().includes(term);
      const matchesRole = filterRole === "all" || m.role === filterRole;
      return matchesSearch && matchesRole;
    });
  }, [members, searchTerm, filterRole]);

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

  useEffect(() => {
    if (!canManageRoles && activeTab === "management") {
      setActiveTab("leaderboard");
    }
  }, [activeTab, canManageRoles]);

  const heroContent =
    activeTab === "leaderboard"
      ? {
          title: "μpoint hall of fame",
          subtitle:
            "celebrate every win and see who's lighting up frc team 7157",
        }
      : {
          title: "member management",
          subtitle:
            "assign roles, keep permissions tight, and maintain roster harmony",
        };

  const tabOptions = useMemo(() => {
    const tabs: Array<{
      id: "leaderboard" | "management";
      label: string;
      icon: JSX.Element;
    }> = [
      {
        id: "leaderboard",
        label: "leaderboard",
        icon: <Trophy size={16} />,
      },
    ];
    if (canManageRoles) {
      tabs.push({
        id: "management",
        label: "member management",
        icon: <Users2 size={16} />,
      });
    }
    return tabs;
  }, [canManageRoles]);

  const currentMemberEntry = leaderboard.find(
    (entry) => entry.memberId === member._id
  );
  const currentMemberRank = currentMemberEntry
    ? leaderboard.findIndex((entry) => entry.memberId === member._id) + 1
    : null;
  const maxLeaderboardPoints = leaderboard.length
    ? leaderboard[0].totalPoints || 0
    : 0;

  const selectedMember = selectedMemberId
    ? members.find((m) => m._id === selectedMemberId) ?? null
    : null;

  const selectedMemberLeaderboardEntry = selectedMemberId
    ? leaderboard.find((entry) => entry.memberId === selectedMemberId)
    : undefined;

  const selectedMemberAwardsCount =
    selectedMemberLeaderboardEntry?.awardsCount ?? 0;
  const selectedMemberTotalPoints =
    selectedMemberLeaderboardEntry?.totalPoints ?? 0;
  const selectedMemberAwardsLabel =
    selectedMemberAwardsCount === 1 ? "award" : "awards";

  const isHistoryLoading =
    selectedMemberId !== null && selectedMemberPoints === undefined;
  const memberHistory = selectedMemberPoints ?? [];

  const handleRoleChange = async (
    memberId: string,
    newRole: "admin" | "lead" | "member"
  ) => {
    try {
      await updateMemberRole({ memberId: memberId as any, newRole });
      toast.success("member role updated successfully");
    } catch (error) {
      toast.error("failed to update member role");
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

  const getTabButtonClass = (tab: "leaderboard" | "management") =>
    clsx(
      "px-4 py-2 rounded-xl text-xs font-mono tracking-widest uppercase transition",
      "border flex items-center gap-2",
      tab === activeTab
        ? "bg-gradient-orange-red text-void-black border-transparent shadow-[0_8px_24px_rgba(249,115,22,0.3)]"
        : "bg-glass border-border-glass text-text-muted hover:text-text-primary"
    );

  return (
    <div className="space-y-6">
      <div className="glass-panel p-8 overflow-hidden relative">
        <div className="absolute -top-24 -right-32 h-64 w-64 bg-sunset-orange/20 blur-3xl rounded-full" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 bg-accent-purple/20 blur-3xl rounded-full" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 text-text-primary mb-2">
              <Sparkles size={22} className="text-sunset-orange" />
              <h1 className="text-3xl font-light">{heroContent.title}</h1>
            </div>
            <p className="text-text-muted max-w-xl">{heroContent.subtitle}</p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-3xl font-light text-sunset-orange">
                {members.length}
              </p>
              <p className="text-sm text-text-dim">team members</p>
            </div>
            {activeTab === "leaderboard" && currentMemberRank && (
              <div className="text-center">
                <p className="text-3xl font-light text-accent-purple">
                  #{currentMemberRank.toLocaleString()}
                </p>
                <p className="text-sm text-text-dim">your rank</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 relative z-10">
          {tabOptions.map((tab) => (
            <button
              key={tab.id}
              className={getTabButtonClass(tab.id)}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "leaderboard" ? (
        <>
          <div className="glass-panel p-8 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute h-32 w-32 bg-sunset-orange/20 blur-3xl top-6 left-6" />
              <div className="absolute h-28 w-28 bg-accent-purple/20 blur-3xl bottom-6 right-10" />
              <div className="absolute h-24 w-24 bg-emerald-400/20 blur-3xl bottom-1/2 right-1/4" />
            </div>
            <div className="relative z-10 flex flex-col gap-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 text-text-primary">
                    <Trophy size={26} className="text-sunset-orange" />
                    <h2 className="text-2xl font-light">μpoint leaderboard</h2>
                  </div>
                  <p className="text-sm text-text-muted mt-2">
                    {canAwardPoints
                      ? "celebrate the daily wins—tap any member to peek at their recognition story or drop fresh μpoints."
                      : "celebrate the daily wins—tap any member to peek at their recognition story."}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-6 text-center md:text-right">
                  <div>
                    <p className="text-3xl font-light text-sunset-orange">
                      {formatPoints(leaderboardStats.totalPoints)}
                    </p>
                    <p className="text-xs text-text-dim uppercase tracking-widest">
                      μpoints awarded
                    </p>
                  </div>
                  <div>
                    <p className="text-3xl font-light text-accent-purple">
                      {leaderboardStats.totalAwards}
                    </p>
                    <p className="text-xs text-text-dim uppercase tracking-widest">
                      recognitions logged
                    </p>
                  </div>
                </div>
              </div>
              {currentMemberEntry && (
                <div className="bg-glass border border-border-glass rounded-2xl px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-3 text-text-primary">
                    <span className="badge bg-gradient-orange-red text-void-black border-transparent">
                      that's you!
                    </span>
                    <p className="text-sm text-text-muted">
                      keep shining—your recognitions total {" "}
                      {formatPoints(currentMemberEntry.totalPoints)} μpoints
                      across {currentMemberEntry.awardsCount.toLocaleString()} {" "}
                      {currentMemberEntry.awardsCount === 1 ? "award" : "awards"}.
                    </p>
                  </div>
                  <button
                    className="btn-modern btn-secondary px-4 py-2 text-sm"
                    onClick={() => openMemberDetails(currentMemberEntry.memberId)}
                  >
                    view your story
                  </button>
                </div>
              )}
            </div>
          </div>

          {leaderboard.length === 0 ? (
            <div className="glass-panel p-8 text-center">
              <p className="text-text-muted">
                no μpoints have been awarded yet. once recognitions are logged,
                leaderboard standings will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <TopThreeShowcase
                leaderboard={leaderboard}
                onSelect={openMemberDetails}
                currentMemberId={member._id}
                formatPoints={formatPoints}
                formatAwardDate={formatAwardDate}
                maxPoints={maxLeaderboardPoints}
              />
              <div className="space-y-4">
                {leaderboard.slice(3).map((entry, index) => {
                  const awardsSummary =
                    entry.awardsCount === 0
                      ? "no μpoints yet"
                      : `${entry.awardsCount} ${
                          entry.awardsCount === 1 ? "award" : "awards"
                        } • last awarded ${formatAwardDate(
                          entry.lastAwardedAt
                        )}`;
                  const isCurrentUser = entry.memberId === member._id;
                  const percentage = maxLeaderboardPoints
                    ? Math.max(
                        12,
                        Math.min(
                          100,
                          (entry.totalPoints / maxLeaderboardPoints) * 100
                        )
                      )
                    : 0;
                  return (
                    <button
                      key={entry.memberId}
                      className={clsx(
                        "w-full text-left bg-glass border border-border-glass rounded-2xl p-6 transition transform hover:-translate-y-1",
                        "hover:shadow-[0_18px_45px_rgba(249,115,22,0.15)]",
                        isCurrentUser &&
                          "border-sunset-orange/60 shadow-[0_18px_40px_rgba(168,85,247,0.18)]"
                      )}
                      onClick={() => openMemberDetails(entry.memberId)}
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <span className="badge bg-glass border border-border-glass min-w-[48px] justify-center text-sm">
                            #{index + 4}
                          </span>
                          <div>
                            <h3 className="text-lg font-light text-text-primary flex items-center gap-2">
                              {entry.name}
                              {isCurrentUser && (
                                <span className="text-xs text-accent-purple bg-accent-purple/20 px-2 py-0.5 rounded-full">
                                  you
                                </span>
                              )}
                            </h3>
                            <p className="text-xs text-text-muted">
                              {awardsSummary}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-light text-sunset-orange">
                            +{formatPoints(entry.totalPoints)}
                          </p>
                          <p className="text-xs text-text-dim">μpoints</p>
                        </div>
                      </div>
                      <div className="mt-4 h-2 bg-border-glass rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-orange-red"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="glass-panel p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-6">
              <div>
                <h2 className="text-2xl font-light text-text-primary">
                  member roster overview
                </h2>
                <p className="text-sm text-text-muted mt-2">
                  quick glance at how responsibilities are distributed across
                  the team.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card-modern text-center">
                <div className="text-2xl font-light text-error-red mb-1">
                  {roleStats.admin}
                </div>
                <div className="text-sm text-text-muted">admins</div>
              </div>
              <div className="card-modern text-center">
                <div className="text-2xl font-light text-yellow-400 mb-1">
                  {roleStats.lead}
                </div>
                <div className="text-sm text-text-muted">leads</div>
              </div>
              <div className="card-modern text-center">
                <div className="text-2xl font-light text-blue-400 mb-1">
                  {roleStats.member}
                </div>
                <div className="text-sm text-text-muted">members</div>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                placeholder="search by name or email..."
                className="input-modern flex-1"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select
                className="input-modern md:w-48"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="all">all roles</option>
                <option value="admin">admins only</option>
                <option value="lead">leads only</option>
                <option value="member">members only</option>
              </select>
            </div>
          </div>

          <div className="glass-panel p-6">
            <h4 className="text-sm font-mono text-text-secondary mb-4">
              role permissions
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start gap-3">
                <span className="badge badge-rejected">admin</span>
                <span className="text-text-muted">
                  full access to all features
                </span>
              </div>
              <div className="flex items-start gap-3">
                <span className="badge badge-pending">lead</span>
                <span className="text-text-muted">
                  manage meetings & purchases
                </span>
              </div>
              <div className="flex items-start gap-3">
                <span className="badge badge-ordered">member</span>
                <span className="text-text-muted">
                  submit purchase requests
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {filteredMembers.length === 0 ? (
              <div className="glass-panel p-8 text-center">
                <p className="text-text-muted">
                  {searchTerm || filterRole !== "all"
                    ? "no members found matching your criteria"
                    : "no members found"}
                </p>
              </div>
            ) : (
              filteredMembers.map((teamMember) => (
                <div key={teamMember._id} className="card-modern">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="avatar">
                        {teamMember.name.charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <h4 className="font-light text-lg text-text-primary flex items-center gap-2">
                          {teamMember.name}
                          {teamMember._id === member._id && (
                            <span className="text-xs text-sunset-orange bg-sunset-orange-dim px-2 py-0.5 rounded-full">
                              you
                            </span>
                          )}
                        </h4>
                        <p className="text-sm text-text-muted">
                          {teamMember.email}
                        </p>
                        <p className="text-xs text-text-dim mt-1">
                          joined {formatJoinDate(teamMember.joinedAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {canManageRoles && teamMember._id !== member._id ? (
                        <select
                          value={teamMember.role}
                          onChange={(e) =>
                            handleRoleChange(
                              teamMember._id,
                              e.target.value as "admin" | "lead" | "member"
                            )
                          }
                          className="input-modern py-2 px-4 text-sm"
                        >
                          <option value="member">member</option>
                          <option value="lead">lead</option>
                          <option value="admin">admin</option>
                        </select>
                      ) : (
                        <RoleBadge role={teamMember.role} />
                      )}
                      {canManageRoles && teamMember._id !== member._id && (
                        <button
                          className="btn-modern btn-danger p-2"
                          title="Remove member"
                          onClick={async () => {
                            if (!confirm(`Remove ${teamMember.name}?`)) return;
                            try {
                              await deleteMember({
                                memberId: teamMember._id as any,
                              });
                              toast.success("member removed");
                            } catch (e) {
                              toast.error("failed to remove member");
                            }
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

          {canManageRoles && (
            <div className="glass-panel p-6 border border-yellow-500/30">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  size={20}
                  className="text-yellow-400 flex-shrink-0 mt-0.5"
                />
                <div>
                  <h4 className="text-sm font-mono text-yellow-400 mb-2">
                    admin note
                  </h4>
                  <p className="text-sm text-text-muted">
                    be careful when changing member roles. admins have full
                    access to all system features. you cannot change your own
                    role for security reasons.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {selectedMemberId !== null && (
        <Modal
          onClose={closeMemberDetails}
          title="μpoint details"
          maxWidthClassName="max-w-3xl"
        >
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div>
                <h3 className="text-2xl font-light text-text-primary">
                  {selectedMember?.name ?? "team member"}
                </h3>
                {selectedMember?.email && (
                  <p className="text-sm text-text-muted mt-1">
                    {selectedMember.email}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-4xl font-light text-sunset-orange">
                  +{formatPoints(selectedMemberTotalPoints)}
                </p>
                <p className="text-xs text-text-dim">total μpoints</p>
                <p className="text-xs text-text-muted mt-1">
                  {selectedMemberAwardsCount.toLocaleString()} {" "}
                  {selectedMemberAwardsLabel}
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

function TopThreeShowcase({
  leaderboard,
  onSelect,
  currentMemberId,
  formatPoints,
  formatAwardDate,
  maxPoints,
}: {
  leaderboard: LeaderboardEntry[];
  onSelect: (id: Id<"members">) => void;
  currentMemberId: Id<"members">;
  formatPoints: (value: number) => string;
  formatAwardDate: (timestamp: number | null) => string;
  maxPoints: number;
}) {
  const topThree = leaderboard.slice(0, 3);
  if (topThree.length === 0) {
    return null;
  }

  const cardStyles = [
    "bg-gradient-to-br from-amber-200 via-orange-400 to-rose-500 text-void-black",
    "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white",
    "bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 text-white",
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {topThree.map((entry, index) => {
        const isCurrentUser = entry.memberId === currentMemberId;
        const awardsSummary =
          entry.awardsCount === 0
            ? "awaiting first recognition"
            : `${entry.awardsCount} ${
                entry.awardsCount === 1 ? "award" : "awards"
              } • last awarded ${formatAwardDate(entry.lastAwardedAt)}`;
        const percentage = maxPoints
          ? Math.max(
              18,
              Math.min(100, (entry.totalPoints / maxPoints) * 100)
            )
          : 0;

        return (
          <button
            key={entry.memberId}
            className={clsx(
              "relative overflow-hidden rounded-3xl p-6 text-left transition transform hover:-translate-y-1 hover:scale-[1.01]",
              "shadow-[0_25px_60px_rgba(249,115,22,0.2)]",
              cardStyles[index] ?? "bg-gradient-orange-red text-void-black"
            )}
            onClick={() => onSelect(entry.memberId)}
          >
            <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.6),_transparent_60%)]" />
            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="badge bg-black/10 border border-white/20 backdrop-blur-sm text-xs uppercase tracking-widest">
                  #{index + 1}
                </span>
                {index === 0 ? (
                  <Crown size={24} className="text-yellow-200" />
                ) : (
                  <Medal
                    size={22}
                    className={index === 1 ? "text-white/80" : "text-white/70"}
                  />
                )}
              </div>
              <div>
                <h3 className="text-2xl font-light flex items-center gap-2">
                  {entry.name}
                  {isCurrentUser && (
                    <span className="text-xs font-semibold uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full">
                      you
                    </span>
                  )}
                </h3>
                <p className="text-sm opacity-80 mt-1">{awardsSummary}</p>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-4xl font-light">
                  +{formatPoints(entry.totalPoints)}
                </p>
                <p className="text-xs uppercase tracking-widest opacity-80">
                  μpoints
                </p>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/80"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
            {isCurrentUser && (
              <span className="absolute top-4 right-4 badge bg-white/80 text-void-black border-transparent">
                shining
              </span>
            )}
          </button>
        );
      })}
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
