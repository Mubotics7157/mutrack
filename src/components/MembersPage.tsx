import { useMemo, useState, type FormEvent } from "react";
import clsx from "clsx";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { type Doc, type Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { AlertTriangle, Trash2, Trophy, PlusCircle } from "lucide-react";
import { Modal } from "./Modal";

interface MembersPageProps {
  member: Doc<"members">;
}

export function MembersPage({ member }: MembersPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"directory" | "leaderboard">("directory");
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

  const filteredMembers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return members.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(term) || m.email.toLowerCase().includes(term);
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
      return { totalPoints: 0, totalAwards: 0, topMemberName: null as string | null };
    }
    const totalPoints = leaderboard.reduce((sum, entry) => sum + entry.totalPoints, 0);
    const totalAwards = leaderboard.reduce((sum, entry) => sum + entry.awardsCount, 0);
    const topMemberName =
      totalAwards > 0 && leaderboard[0] ? leaderboard[0].name : null;
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

  const getRankBadgeClass = (index: number) => {
    if (index === 0) {
      return "badge bg-gradient-orange-red text-void-black border-transparent";
    }
    if (index === 1) {
      return "badge bg-white/15 text-white border-white/20";
    }
    if (index === 2) {
      return "badge bg-white/10 text-text-primary border-white/15";
    }
    return "badge bg-glass text-text-muted border-border-glass";
  };

  const getTabButtonClass = (tab: "directory" | "leaderboard") =>
    clsx(
      "px-4 py-2 rounded-xl text-xs font-mono tracking-widest uppercase transition",
      "border flex items-center gap-2",
      tab === activeTab
        ? "bg-gradient-orange-red text-void-black border-transparent shadow-[0_8px_24px_rgba(249,115,22,0.3)]"
        : "bg-glass border-border-glass text-text-muted hover:text-text-primary"
    );

  return (
    <div className="space-y-6">
      <div className="glass-panel p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
          <div>
            <h1 className="text-3xl font-light mb-2">team members</h1>
            <p className="text-text-muted">
              manage roles, permissions, and celebrate wins for frc team 7157
            </p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-3xl font-light text-sunset-orange">{members.length}</p>
              <p className="text-sm text-text-dim">total</p>
            </div>
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

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className={getTabButtonClass("directory")}
            onClick={() => setActiveTab("directory")}
          >
            directory
          </button>
          <button
            className={getTabButtonClass("leaderboard")}
            onClick={() => setActiveTab("leaderboard")}
          >
            <Trophy size={16} />
            leaderboard
          </button>
        </div>
      </div>

      {activeTab === "directory" ? (
        <>
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
            <h4 className="text-sm font-mono text-text-secondary mb-4">role permissions</h4>
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
                        <p className="text-sm text-text-muted">{teamMember.email}</p>
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
                  <h4 className="text-sm font-mono text-yellow-400 mb-2">admin note</h4>
                  <p className="text-sm text-text-muted">
                    be careful when changing member roles. admins have full access to all
                    system features. you cannot change your own role for security reasons.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="glass-panel p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 text-text-primary">
                  <Trophy size={24} className="text-sunset-orange" />
                  <h2 className="text-2xl font-light">μpoint leaderboard</h2>
                </div>
                <p className="text-sm text-text-muted mt-2">
                  {canAwardPoints
                    ? "click a member to recognize them with μpoints and view their history."
                    : "click a member to view their μpoint history."}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center md:text-right">
                <div>
                  <p className="text-2xl font-light text-sunset-orange">
                    {formatPoints(leaderboardStats.totalPoints)}
                  </p>
                  <p className="text-xs text-text-dim">μpoints awarded</p>
                </div>
                <div>
                  <p className="text-2xl font-light text-accent-purple">
                    {leaderboardStats.totalAwards}
                  </p>
                  <p className="text-xs text-text-dim">recognitions logged</p>
                </div>
              </div>
            </div>
            {leaderboardStats.topMemberName && (
              <div className="mt-6 text-sm text-text-muted">
                🏆 leading: <span className="text-text-primary">{leaderboardStats.topMemberName}</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {leaderboard.length === 0 ? (
              <div className="glass-panel p-8 text-center">
                <p className="text-text-muted">
                  no μpoints have been awarded yet. once recognitions are logged,
                  leaderboard standings will appear here.
                </p>
              </div>
            ) : (
              leaderboard.map((entry, index) => {
                const awardsSummary =
                  entry.awardsCount === 0
                    ? "no μpoints yet"
                    : `${entry.awardsCount} ${
                        entry.awardsCount === 1 ? "award" : "awards"
                      } • last awarded ${formatAwardDate(entry.lastAwardedAt)}`;

                return (
                  <div
                    key={entry.memberId}
                    className="card-modern cursor-pointer"
                    onClick={() => openMemberDetails(entry.memberId)}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="avatar">
                          {entry.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap text-text-primary">
                            <h4 className="font-light text-lg">{entry.name}</h4>
                            <span className={getRankBadgeClass(index)}>#{index + 1}</span>
                            {entry.memberId === member._id && (
                              <span className="text-xs text-sunset-orange bg-sunset-orange-dim px-2 py-0.5 rounded-full">
                                you
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-text-muted">{entry.email}</p>
                          <p className="text-xs text-text-dim mt-1">{awardsSummary}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-2 text-sunset-orange">
                          <Trophy size={18} />
                          <p className="text-3xl font-light">
                            +{formatPoints(entry.totalPoints)}
                          </p>
                        </div>
                        <p className="text-xs text-text-dim mt-1">total μpoints</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {selectedMemberId && (
        <Modal
          isOpen={selectedMemberId !== null}
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

