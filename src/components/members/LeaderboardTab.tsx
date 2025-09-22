import { useMemo, useState, type FormEvent } from "react";
import clsx from "clsx";
import { type Id } from "../../../convex/_generated/dataModel";
import { Modal } from "../Modal";
import {
  ClipboardList,
  Crown,
  CheckCircle2,
  Sparkles,
  Target,
  Trophy,
  Clock,
  Medal,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import { BountyBoardData, LeaderboardEntry, BountyEntry } from "./types";
import {
  formatDateTime,
  formatAwardDate as formatAwardDateFn,
  formatPoints as formatPointsFn,
  formatHours as formatHoursFn,
} from "./../members/helpers";
import { MemberWithProfile } from "../../lib/members";
import { ProfileAvatar } from "../ProfileAvatar";

export interface LeaderboardTabProps {
  leaderboard: Array<LeaderboardEntry>;
  leaderboardStats: {
    totalPoints: number;
    totalAwards: number;
    totalHours: number;
    totalMeetings: number;
    topMemberName: string | null;
  };
  onSelectMember: (memberId: Id<"members">) => void;
  currentMemberId: Id<"members">;
  formatPoints?: (value: number) => string;
  formatAwardDate?: (timestamp: number | null) => string;
  formatHours?: (value: number) => string;
  canAwardPoints: boolean;
  bountyBoard: BountyBoardData;
  members: Array<MemberWithProfile>;
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
  const formatHours = props.formatHours ?? formatHoursFn;

  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);
  const leaderPoints = leaderboard[0]?.totalPoints ?? 0;

  const hoursLeaderboard = useMemo(
    () =>
      [...leaderboard].sort((a, b) => {
        if (b.totalHours !== a.totalHours) {
          return b.totalHours - a.totalHours;
        }
        const lastSeenDiff = (b.lastAttendedAt ?? 0) - (a.lastAttendedAt ?? 0);
        if (lastSeenDiff !== 0) {
          return lastSeenDiff;
        }
        return a.name.localeCompare(b.name);
      }),
    [leaderboard]
  );

  const hoursLeader = hoursLeaderboard[0];
  const leaderHours = hoursLeader?.totalHours ?? 0;
  const hoursTopThree = hoursLeaderboard.slice(0, 3);
  const hoursRest = hoursLeaderboard.slice(3);
  const hasAttendanceData = hoursLeaderboard.some(
    (entry) => entry.totalHours > 0
  );

  const pointsRankMap = useMemo(() => {
    const map = new Map<Id<"members">, number>();
    leaderboard.forEach((entry, index) => {
      map.set(entry.memberId, index + 1);
    });
    return map;
  }, [leaderboard]);

  const hoursRankMap = useMemo(() => {
    const map = new Map<Id<"members">, number>();
    hoursLeaderboard.forEach((entry, index) => {
      map.set(entry.memberId, index + 1);
    });
    return map;
  }, [hoursLeaderboard]);

  const doubleChampionId =
    leaderPoints > 0 &&
    leaderHours > 0 &&
    hoursLeader &&
    leaderboard[0]?.memberId === hoursLeader.memberId
      ? hoursLeader.memberId
      : null;

  const computeProgress = (value: number, leaderValue: number) => {
    if (leaderValue <= 0) {
      return value > 0 ? 100 : 0;
    }
    if (value <= 0) return 0;
    const percentage = Math.round((value / leaderValue) * 100);
    return Math.min(100, Math.max(6, percentage));
  };

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
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-text-primary">
              <Trophy size={22} className="text-sunset-orange drop-shadow" />
              <h2 className="text-2xl font-light">μpoint leaderboard</h2>
            </div>
            <p className="text-sm text-text-muted">
              {canAwardPoints
                ? "tap a teammate to celebrate them with μpoints and peek at their highlight reel."
                : "tap a teammate to explore their μpoint highlight reel."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
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
            <div>
              <p className="text-2xl font-light text-accent-purple">
                {formatHours(leaderboardStats.totalHours)}
              </p>
              <p className="text-xs text-text-dim uppercase tracking-widest">
                hours tracked
              </p>
            </div>
            <div>
              <p className="text-2xl font-light text-sunset-orange">
                {leaderboardStats.totalMeetings.toLocaleString()}
              </p>
              <p className="text-xs text-text-dim uppercase tracking-widest">
                check-ins logged
              </p>
            </div>
          </div>
        </div>
        {(leaderboardStats.topMemberName || leaderHours > 0) && (
          <div className="relative z-10 mt-4 text-sm text-text-muted space-y-1 md:space-y-0 md:flex md:flex-wrap md:items-center md:gap-4">
            {doubleChampionId ? (
              <span className="inline-flex items-center gap-2 text-yellow-200">
                <Sparkles size={16} className="text-yellow-300 drop-shadow" />
                <span>
                  double crown:
                  <span className="text-text-primary">
                    {hoursLeader?.name ?? leaderboardStats.topMemberName}
                  </span>
                  {" "}reigns over μpoints and hours!
                </span>
              </span>
            ) : (
              <>
                {leaderboardStats.topMemberName && (
                  <span>
                    🏆 leading μpoints:
                    <span className="text-text-primary">
                      {" "}
                      {leaderboardStats.topMemberName}
                    </span>
                  </span>
                )}
                {leaderHours > 0 && hoursLeader?.name && (
                  <span>
                    ⏱ hours hero:
                    <span className="text-text-primary">
                      {" "}
                      {hoursLeader.name}
                    </span>
                  </span>
                )}
              </>
            )}
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
                <PointsSpotlightCard
                  key={entry.memberId}
                  entry={entry}
                  index={index}
                  formatPoints={formatPoints}
                  formatHours={formatHours}
                  formatAwardDate={formatAwardDate}
                  isYou={entry.memberId === currentMemberId}
                  hoursRank={hoursRankMap.get(entry.memberId)}
                  isDoubleChampion={entry.memberId === doubleChampionId}
                  onSelect={() => onSelectMember(entry.memberId)}
                />
              ))}
            </div>
          )}

          {rest.length > 0 && (
            <div className="space-y-3">
              {rest.map((entry, index) => {
                const absoluteRank = index + topThree.length;
                const pointsProgress = computeProgress(
                  entry.totalPoints,
                  leaderPoints
                );
                const hoursProgress = computeProgress(
                  entry.totalHours,
                  leaderHours
                );
                const hoursRank = hoursRankMap.get(entry.memberId);
                const isDoubleChampion = entry.memberId === doubleChampionId;
                return (
                  <button
                    key={entry.memberId}
                    type="button"
                    onClick={() => onSelectMember(entry.memberId)}
                    className="w-full text-left"
                  >
                    <div
                      className={clsx(
                        "card-modern hover:-translate-y-1 transition-transform",
                        isDoubleChampion &&
                          "border border-yellow-300/40 shadow-[0_0_26px_rgba(250,204,21,0.25)]"
                      )}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-glass via-white/10 to-transparent border border-white/10 flex items-center justify-center text-sm font-semibold text-text-secondary">
                              #{absoluteRank + 1}
                            </div>
                            <ProfileAvatar
                              name={entry.name}
                              imageUrl={entry.profileImageUrl}
                              size="lg"
                              className="border border-white/20"
                            />
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
                              {isDoubleChampion && <DoubleChampionBadge />}
                              {!isDoubleChampion &&
                                hoursRank !== undefined &&
                                hoursRank <= 3 && (
                                  <HoursBadge rank={hoursRank} />
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
                            <p className="text-xs text-text-dim mt-1">
                              {entry.meetingsAttended === 0
                                ? "no attendance recorded yet"
                                : `${entry.meetingsAttended.toLocaleString()} ${
                                    entry.meetingsAttended === 1
                                      ? "check-in"
                                      : "check-ins"
                                  } • last seen ${
                                    entry.lastAttendedAt
                                      ? formatAwardDate(entry.lastAttendedAt)
                                      : "recently"
                                  }`}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 text-right">
                          <div>
                            <p className="text-2xl font-light text-sunset-orange">
                              +{formatPoints(entry.totalPoints)}
                            </p>
                            <p className="text-xs text-text-dim uppercase tracking-widest mt-1">
                              total μpoints
                            </p>
                          </div>
                          <div className="inline-flex items-center gap-2 rounded-full bg-accent-purple/15 border border-accent-purple/30 px-3 py-1 text-xs text-accent-purple">
                            <Clock size={14} className="text-accent-purple" />
                            <span>{formatHours(entry.totalHours)} hrs</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-sunset-orange via-amber-400 to-accent-purple"
                            style={{ width: `${pointsProgress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] uppercase tracking-widest text-text-dim">
                          <span>μpoints rank</span>
                          <span>#{absoluteRank + 1}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-accent-purple via-indigo-400 to-sky-400"
                            style={{ width: `${hoursProgress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] uppercase tracking-widest text-text-dim">
                          <span>hours rank</span>
                          <span>
                            {hoursRank !== undefined ? `#${hoursRank}` : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-10 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-2 text-text-primary">
                <Clock size={20} className="text-accent-purple" />
                <h3 className="text-xl font-light">attendance all-stars</h3>
              </div>
              {hasAttendanceData && leaderHours > 0 && (
                <div className="text-xs md:text-sm text-text-muted uppercase tracking-widest">
                  pace setter: {formatHours(leaderHours)} hrs
                </div>
              )}
            </div>

            {!hasAttendanceData ? (
              <div className="glass-panel p-6 text-center text-text-muted">
                once meetings are tracked, the attendance leaderboard will shine here.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {hoursTopThree.map((entry, index) => (
                    <HoursSpotlightCard
                      key={entry.memberId}
                      entry={entry}
                      index={index}
                      formatHours={formatHours}
                      formatPoints={formatPoints}
                      formatAwardDate={formatAwardDate}
                      isYou={entry.memberId === currentMemberId}
                      pointsRank={pointsRankMap.get(entry.memberId)}
                      isDoubleChampion={entry.memberId === doubleChampionId}
                      onSelect={() => onSelectMember(entry.memberId)}
                    />
                  ))}
                </div>

                {hoursRest.length > 0 && (
                  <div className="space-y-3">
                    {hoursRest.map((entry, index) => {
                      const absoluteRank = index + hoursTopThree.length;
                      const hoursProgress = computeProgress(
                        entry.totalHours,
                        leaderHours
                      );
                      const pointsProgress = computeProgress(
                        entry.totalPoints,
                        leaderPoints
                      );
                      const pointsRank = pointsRankMap.get(entry.memberId);
                      const isDoubleChampion =
                        entry.memberId === doubleChampionId;
                      return (
                        <button
                          key={entry.memberId}
                          type="button"
                          onClick={() => onSelectMember(entry.memberId)}
                          className="w-full text-left"
                        >
                          <div
                            className={clsx(
                              "card-modern hover:-translate-y-1 transition-transform",
                              isDoubleChampion &&
                                "border border-yellow-300/40 shadow-[0_0_26px_rgba(250,204,21,0.25)]"
                            )}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                              <div className="flex items-start gap-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-glass via-white/10 to-transparent border border-white/10 flex items-center justify-center text-sm font-semibold text-text-secondary">
                                    ⏱#{absoluteRank + 1}
                                  </div>
                                  <ProfileAvatar
                                    name={entry.name}
                                    imageUrl={entry.profileImageUrl}
                                    size="lg"
                                    className="border border-white/20"
                                  />
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
                                    {isDoubleChampion && <DoubleChampionBadge />}
                                    {!isDoubleChampion &&
                                      pointsRank !== undefined &&
                                      pointsRank <= 3 && (
                                        <PointsBadge rank={pointsRank} />
                                      )}
                                  </div>
                                  <p className="text-sm text-text-muted">
                                    {entry.email}
                                  </p>
                                  <p className="text-xs text-text-dim mt-1">
                                    {entry.meetingsAttended === 0
                                      ? "no attendance recorded yet"
                                      : `${entry.meetingsAttended.toLocaleString()} ${
                                          entry.meetingsAttended === 1
                                            ? "check-in"
                                            : "check-ins"
                                        } • last seen ${
                                          entry.lastAttendedAt
                                            ? formatAwardDate(entry.lastAttendedAt)
                                            : "recently"
                                        }`}
                                  </p>
                                  <p className="text-xs text-text-dim mt-1">
                                    {entry.totalPoints === 0
                                      ? "no μpoints yet"
                                      : `${formatPoints(entry.totalPoints)} μpoints • points rank ${
                                          pointsRank ? `#${pointsRank}` : "—"
                                        }`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2 text-right">
                                <div>
                                  <p className="text-2xl font-light text-accent-purple">
                                    {formatHours(entry.totalHours)} hrs
                                  </p>
                                  <p className="text-xs text-text-dim uppercase tracking-widest mt-1">
                                    attendance logged
                                  </p>
                                </div>
                                <div className="inline-flex items-center gap-2 rounded-full bg-sunset-orange/15 border border-sunset-orange/30 px-3 py-1 text-xs text-sunset-orange">
                                  <Timer size={14} className="text-sunset-orange" />
                                  <span>
                                    {entry.meetingsAttended.toLocaleString()} check-ins
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="mt-4 space-y-2">
                              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-accent-purple via-indigo-400 to-sky-400"
                                  style={{ width: `${hoursProgress}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[10px] uppercase tracking-widest text-text-dim">
                                <span>hours rank</span>
                                <span>#{absoluteRank + 1}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-sunset-orange via-amber-400 to-accent-purple"
                                  style={{ width: `${pointsProgress}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[10px] uppercase tracking-widest text-text-dim">
                                <span>μpoints rank</span>
                                <span>
                                  {pointsRank !== undefined ? `#${pointsRank}` : "—"}
                                </span>
                              </div>
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

function PointsSpotlightCard({
  entry,
  index,
  formatPoints,
  formatHours,
  formatAwardDate,
  isYou,
  hoursRank,
  isDoubleChampion,
  onSelect,
}: {
  entry: LeaderboardEntry;
  index: number;
  formatPoints: (value: number) => string;
  formatHours: (value: number) => string;
  formatAwardDate: (timestamp: number | null) => string;
  isYou: boolean;
  hoursRank: number | undefined;
  isDoubleChampion: boolean;
  onSelect: () => void;
}) {
  const backgroundClass = getSpotlightBackground(index);
  const avatarClassName = clsx(
    "border-2 border-white/50",
    index === 0 && "border-amber-200/80 shadow-[0_0_28px_rgba(251,191,36,0.35)]",
    index === 1 && "border-white/60 shadow-[0_0_22px_rgba(148,163,184,0.35)]",
    index === 2 && "border-sunset-orange/70 shadow-[0_0_22px_rgba(251,146,60,0.35)]"
  );
  return (
    <button
      type="button"
      onClick={onSelect}
      className="relative overflow-hidden rounded-3xl border border-white/15 p-6 text-left transition-transform hover:-translate-y-1"
    >
      <div className={clsx("absolute inset-0 opacity-80", backgroundClass)} />
      <div className="relative z-10 flex flex-col h-full justify-between gap-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <ProfileAvatar
              name={entry.name}
              imageUrl={entry.profileImageUrl}
              size="xl"
              className={avatarClassName}
            />
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
                {isDoubleChampion && <DoubleChampionBadge variant="inverse" />}
                {!isDoubleChampion &&
                  hoursRank !== undefined &&
                  hoursRank <= 3 && (
                    <HoursBadge rank={hoursRank} variant="inverse" />
                  )}
              </div>
              <p className="text-sm text-white/70 mt-1">{entry.email}</p>
              <p className="text-xs text-white/60 mt-2">
                {entry.awardsCount === 0
                  ? "no μpoints yet"
                  : `${entry.awardsCount} ${entry.awardsCount === 1 ? "award" : "awards"} • last awarded ${formatAwardDate(entry.lastAwardedAt)}`}
              </p>
              <p className="text-xs text-white/60 mt-1">
                {entry.meetingsAttended === 0
                  ? "no attendance recorded yet"
                  : `${entry.meetingsAttended.toLocaleString()} ${
                      entry.meetingsAttended === 1 ? "check-in" : "check-ins"
                    } • last seen ${
                      entry.lastAttendedAt
                        ? formatAwardDate(entry.lastAttendedAt)
                        : "recently"
                    }`}
              </p>
            </div>
          </div>
          {index === 0 ? (
            <Crown size={32} className="text-amber-200 drop-shadow-lg" />
          ) : (
            <Trophy size={28} className="text-white/80" />
          )}
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-4xl font-light drop-shadow-lg">
              +{formatPoints(entry.totalPoints)}
            </p>
            <p className="text-xs uppercase tracking-widest text-white/70 mt-1">
              total μpoints
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-sm">
            <Clock size={16} className="text-amber-200" />
            <span>{formatHours(entry.totalHours)} hrs logged</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function HoursSpotlightCard({
  entry,
  index,
  formatHours,
  formatPoints,
  formatAwardDate,
  isYou,
  pointsRank,
  isDoubleChampion,
  onSelect,
}: {
  entry: LeaderboardEntry;
  index: number;
  formatHours: (value: number) => string;
  formatPoints: (value: number) => string;
  formatAwardDate: (timestamp: number | null) => string;
  isYou: boolean;
  pointsRank: number | undefined;
  isDoubleChampion: boolean;
  onSelect: () => void;
}) {
  const backgroundClass = getAttendanceSpotlightBackground(index);
  const avatarClassName = clsx(
    "border-2 border-white/50",
    index === 0 && "border-amber-200/70 shadow-[0_0_26px_rgba(250,204,21,0.35)]",
    index === 1 && "border-white/60 shadow-[0_0_22px_rgba(148,163,184,0.35)]",
    index === 2 && "border-teal-300/70 shadow-[0_0_22px_rgba(45,212,191,0.35)]"
  );
  return (
    <button
      type="button"
      onClick={onSelect}
      className="relative overflow-hidden rounded-3xl border border-white/15 p-6 text-left transition-transform hover:-translate-y-1"
    >
      <div className={clsx("absolute inset-0 opacity-80", backgroundClass)} />
      <div className="relative z-10 flex flex-col h-full justify-between gap-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <ProfileAvatar
              name={entry.name}
              imageUrl={entry.profileImageUrl}
              size="xl"
              className={avatarClassName}
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xl font-light">{entry.name}</h4>
                <span className="badge bg-black/40 border-white/20 text-white">
                  ⏱ #{index + 1}
                </span>
                {isYou && (
                  <span className="text-xs bg-white/30 text-white px-2 py-0.5 rounded-full">
                    you
                  </span>
                )}
                {isDoubleChampion && <DoubleChampionBadge variant="inverse" />}
                {!isDoubleChampion &&
                  pointsRank !== undefined &&
                  pointsRank <= 3 && (
                    <PointsBadge rank={pointsRank} variant="inverse" />
                  )}
              </div>
              <p className="text-sm text-white/70 mt-1">{entry.email}</p>
              <p className="text-xs text-white/60 mt-2">
                {entry.meetingsAttended === 0
                  ? "no attendance recorded yet"
                  : `${entry.meetingsAttended.toLocaleString()} ${
                      entry.meetingsAttended === 1 ? "check-in" : "check-ins"
                    } • last seen ${
                      entry.lastAttendedAt
                        ? formatAwardDate(entry.lastAttendedAt)
                        : "recently"
                    }`}
              </p>
              <p className="text-xs text-white/60 mt-1">
                {entry.totalPoints === 0
                  ? "no μpoints yet"
                  : `${formatPoints(entry.totalPoints)} μpoints earned`}
              </p>
            </div>
          </div>
          {index === 0 ? (
            <Timer size={32} className="text-amber-200 drop-shadow-lg" />
          ) : (
            <Medal size={28} className="text-white/80" />
          )}
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-4xl font-light drop-shadow-lg">
              {formatHours(entry.totalHours)} hrs
            </p>
            <p className="text-xs uppercase tracking-widest text-white/70 mt-1">
              attendance logged
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-sm">
            <Clock size={16} className="text-amber-200" />
            <span>{entry.meetingsAttended.toLocaleString()} check-ins</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function DoubleChampionBadge({
  variant = "default",
}: {
  variant?: "default" | "inverse";
}) {
  const base = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em]";
  const palette =
    variant === "inverse"
      ? "bg-yellow-400/20 border border-yellow-200/60 text-yellow-100"
      : "bg-yellow-500/15 border border-yellow-500/40 text-yellow-600";
  const iconClass = variant === "inverse" ? "text-yellow-100" : "text-yellow-500";
  return (
    <span className={clsx(base, palette)}>
      <Sparkles size={12} className={iconClass} /> double crown
    </span>
  );
}

function HoursBadge({
  rank,
  variant = "default",
}: {
  rank: number;
  variant?: "default" | "inverse";
}) {
  const palette =
    variant === "inverse"
      ? "bg-white/20 border border-white/40 text-white"
      : "bg-accent-purple/20 border border-accent-purple/40 text-accent-purple";
  const iconClass = variant === "inverse" ? "text-white" : "text-accent-purple";
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]",
        palette
      )}
    >
      <Clock size={12} className={iconClass} /> hours #{rank}
    </span>
  );
}

function PointsBadge({
  rank,
  variant = "default",
}: {
  rank: number;
  variant?: "default" | "inverse";
}) {
  const palette =
    variant === "inverse"
      ? "bg-white/20 border border-white/40 text-white"
      : "bg-sunset-orange/15 border border-sunset-orange/40 text-sunset-orange";
  const iconClass = variant === "inverse" ? "text-white" : "text-sunset-orange";
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]",
        palette
      )}
    >
      <Medal size={12} className={iconClass} /> μpoints #{rank}
    </span>
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

function getAttendanceSpotlightBackground(index: number) {
  switch (index) {
    case 0:
      return "bg-gradient-to-br from-[#38bdf8]/70 via-[#6366f1]/60 to-transparent";
    case 1:
      return "bg-gradient-to-br from-white/70 via-white/30 to-transparent";
    case 2:
      return "bg-gradient-to-br from-[#2dd4bf]/70 via-[#22d3ee]/60 to-transparent";
    default:
      return "bg-gradient-to-br from-white/10 to-transparent";
  }
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
