import { useMemo, useState, type FormEvent } from "react";
import clsx from "clsx";
import { type Doc, type Id } from "../../../convex/_generated/dataModel";
import { Modal } from "../Modal";
import {
  ClipboardList,
  Crown,
  CheckCircle2,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { BountyBoardData, LeaderboardEntry, BountyEntry } from "./types";
import {
  formatDateTime,
  formatAwardDate as formatAwardDateFn,
  formatPoints as formatPointsFn,
} from "./../members/helpers";

export interface LeaderboardTabProps {
  leaderboard: Array<LeaderboardEntry>;
  leaderboardStats: {
    totalPoints: number;
    totalAwards: number;
    topMemberName: string | null;
  };
  onSelectMember: (memberId: Id<"members">) => void;
  currentMemberId: Id<"members">;
  formatPoints?: (value: number) => string;
  formatAwardDate?: (timestamp: number | null) => string;
  canAwardPoints: boolean;
  bountyBoard: BountyBoardData;
  members: Array<Doc<"members">>;
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

export function LeaderboardTab(props: LeaderboardTabProps) {
  const {
    leaderboard,
    leaderboardStats,
    onSelectMember,
    currentMemberId,
    canAwardPoints,
    bountyBoard,
    members,
    canManageBounties,
    onCreateBounty,
    onCompleteBounty,
    isCreatingBounty,
    completingBountyId,
  } = props;

  const formatPoints = props.formatPoints ?? formatPointsFn;
  const formatAwardDate = props.formatAwardDate ?? formatAwardDateFn;

  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);
  const leaderPoints = leaderboard[0]?.totalPoints ?? 0;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPoints, setNewPoints] = useState("5");

  const [selectedBounty, setSelectedBounty] = useState<BountyEntry | null>(
    null
  );
  const [selectedMemberId, setSelectedMemberId] =
    useState<Id<"members"> | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => a.name.localeCompare(b.name)),
    [members]
  );

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
      setIsCreateModalOpen(false);
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
      setSelectedBounty(null);
      setSelectedMemberId(null);
      setCompletionNotes("");
    }
  };

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
              <p className="text-xs text-text-dim uppercase tracking-widest">
                μpoints awarded
              </p>
            </div>
            <div>
              <p className="text-2xl font-light text-accent-purple">
                {leaderboardStats.totalAwards}
              </p>
              <p className="text-xs text-text-dim uppercase tracking-widest">
                recognitions logged
              </p>
            </div>
          </div>
        </div>
        {leaderboardStats.topMemberName && (
          <div className="relative z-10 mt-4 text-sm text-text-muted">
            🏆 leading the charge:{" "}
            <span className="text-text-primary">
              {leaderboardStats.topMemberName}
            </span>
          </div>
        )}
      </div>

      {leaderboard.length === 0 ? (
        <div className="glass-panel p-8 text-center">
          <p className="text-text-muted">
            no μpoints have been awarded yet. once recognitions are logged, the
            leaderboard will sparkle here.
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

          <OpenBountiesSection
            bountyBoard={bountyBoard}
            canManageBounties={canManageBounties}
            formatPoints={formatPoints}
            onClickCreate={() => setIsCreateModalOpen(true)}
            onClickComplete={(b) => {
              setSelectedBounty(b);
              setSelectedMemberId(null);
              setCompletionNotes("");
            }}
          />

          {rest.length > 0 && (
            <div className="space-y-3">
              {rest.map((entry, index) => {
                const absoluteRank = index + topThree.length;
                const progressRaw = leaderPoints
                  ? Math.min(
                      100,
                      Math.max(
                        6,
                        Math.round((entry.totalPoints / leaderPoints) * 100)
                      )
                    )
                  : 0;
                const progressWidth = `${progressRaw}%`;
                return (
                  <button
                    key={entry.memberId}
                    type="button"
                    onClick={() => onSelectMember(entry.memberId)}
                    className="w-full text-left"
                  >
                    <div className="card-modern hover:-translate-y-1 transition-transform">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-glass via-white/10 to-transparent border border-white/10 flex items-center justify-center text-sm font-semibold text-text-secondary">
                            #{absoluteRank + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap text-text-primary">
                              <h4 className="font-light text-lg">
                                {entry.name}
                              </h4>
                              {entry.memberId === currentMemberId && (
                                <span className="text-xs text-sunset-orange bg-sunset-orange-dim px-2 py-0.5 rounded-full">
                                  you
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-text-muted">
                              {entry.email}
                            </p>
                            <p className="text-xs text-text-dim mt-1">
                              {entry.awardsCount === 0
                                ? "no μpoints yet"
                                : `${entry.awardsCount} ${entry.awardsCount === 1 ? "award" : "awards"} • last awarded ${formatAwardDate(entry.lastAwardedAt)}`}
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

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="post a bounty"
        maxWidthClassName="max-w-lg"
      >
        <form
          onSubmit={(event) => {
            void handleCreateSubmit(event);
          }}
          className="space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
            <div>
              <label className="text-xs font-mono uppercase tracking-widest text-text-secondary mb-2 block">
                bounty title
              </label>
              <input
                type="text"
                className="input-modern"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
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
                onChange={(e) => setNewPoints(e.target.value)}
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
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="share context, deliverables, or links..."
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="btn-modern"
              onClick={() => setIsCreateModalOpen(false)}
            >
              cancel
            </button>
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
      </Modal>

      <Modal
        isOpen={selectedBounty !== null}
        onClose={() => {
          setSelectedBounty(null);
          setSelectedMemberId(null);
          setCompletionNotes("");
        }}
        title={
          selectedBounty
            ? `complete “${selectedBounty.title}”`
            : "complete bounty"
        }
        maxWidthClassName="max-w-lg"
      >
        {selectedBounty && (
          <form
            onSubmit={(event) => {
              void handleCompleteSubmit(event);
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-xs font-mono uppercase tracking-widest text-text-secondary mb-2 block">
                credit μpoints to
              </label>
              <select
                className="input-modern"
                value={selectedMemberId ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
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
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="celebrate what made this bounty complete"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="btn-modern"
                onClick={() => {
                  setSelectedBounty(null);
                  setSelectedMemberId(null);
                  setCompletionNotes("");
                }}
              >
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

function SpotlightCard({
  entry,
  index,
  formatPoints,
  formatAwardDate,
  isYou,
  onSelect,
}: {
  entry: LeaderboardEntry;
  index: number;
  formatPoints: (value: number) => string;
  formatAwardDate: (timestamp: number | null) => string;
  isYou: boolean;
  onSelect: () => void;
}) {
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
              <span className="badge bg-black/40 border-white/20 text-white">
                #{index + 1}
              </span>
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
                : `${entry.awardsCount} ${entry.awardsCount === 1 ? "award" : "awards"} • last awarded ${formatAwardDate(entry.lastAwardedAt)}`}
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

function OpenBountiesSection({
  bountyBoard,
  canManageBounties,
  formatPoints,
  onClickCreate,
  onClickComplete,
}: {
  bountyBoard: BountyBoardData;
  canManageBounties: boolean;
  formatPoints: (value: number) => string;
  onClickCreate: () => void;
  onClickComplete: (bounty: BountyEntry) => void;
}) {
  return (
    <div className="space-y-3 mt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList size={18} className="text-accent-purple" />
          <h4 className="text-sm font-mono uppercase tracking-widest text-text-secondary">
            open bounties
          </h4>
          <span className="text-xs text-text-dim">
            {bountyBoard.openBounties.length === 0
              ? "none yet — post one to get things rolling."
              : `${bountyBoard.openBounties.length} active`}
          </span>
        </div>
        {canManageBounties && (
          <button
            type="button"
            className="btn-modern btn-secondary flex items-center gap-2 px-4 py-2"
            onClick={onClickCreate}
          >
            <Target size={16} /> post bounty
          </button>
        )}
      </div>

      {bountyBoard.openBounties.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {bountyBoard.openBounties.map((bounty) => (
            <div
              key={bounty._id}
              className="relative overflow-hidden rounded-2xl border border-border-glass bg-glass"
            >
              <div className="absolute inset-0 opacity-60 pointer-events-none">
                <div className="absolute -top-16 -left-12 h-36 w-36 rounded-full bg-gradient-to-br from-accent-purple/30 via-pink-500/25 to-transparent blur-3xl" />
                <div className="absolute -bottom-16 -right-12 h-36 w-36 rounded-full bg-gradient-to-br from-sunset-orange/30 via-amber-300/25 to-transparent blur-3xl" />
              </div>
              <div className="relative z-10 p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-light text-text-primary">
                      {bounty.title}
                    </p>
                    {bounty.description && (
                      <p className="text-sm text-text-muted mt-1">
                        {bounty.description}
                      </p>
                    )}
                    <p className="text-xs text-text-dim mt-2">
                      posted by {bounty.createdBy.name} ·{" "}
                      {formatDateTime(bounty.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center gap-2 rounded-xl px-3 py-1 bg-gradient-to-r from-accent-purple/20 via-pink-500/20 to-sunset-orange/20 border border-white/10">
                      <Sparkles size={16} className="text-sunset-orange" />
                      <span className="text-sm font-light text-text-primary">
                        +{formatPoints(bounty.points)} μpoints
                      </span>
                    </div>
                  </div>
                </div>
                {canManageBounties && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="btn-modern btn-primary flex items-center gap-2 px-4 py-2"
                      onClick={() => onClickComplete(bounty)}
                    >
                      <CheckCircle2 size={18} /> mark complete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
