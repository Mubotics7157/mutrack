import { useEffect, useMemo, useState, type FormEvent } from "react";
import clsx from "clsx";
import { type Id } from "../../../convex/_generated/dataModel";
import { Modal } from "../Modal";
import {
  ClipboardList,
  Crown,
  ChevronDown,
  CheckCircle2,
  Sparkles,
  Search,
  Target,
  Trophy,
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
    topMemberName: string | null;
  };
  onSelectMember: (memberId: Id<"members">) => void;
  currentMemberId: Id<"members">;
  formatPoints?: (value: number) => string;
  formatAwardDate?: (timestamp: number | null) => string;
  formatHours?: (valueMs: number) => string;
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

  const hoursLeaderboard = useMemo(() => {
    const sorted = [...leaderboard];
    sorted.sort((a, b) => {
      if (b.totalAttendanceMs !== a.totalAttendanceMs) {
        return b.totalAttendanceMs - a.totalAttendanceMs;
      }
      const lastAttendanceDiff =
        (b.lastAttendanceAt ?? 0) - (a.lastAttendanceAt ?? 0);
      if (lastAttendanceDiff !== 0) {
        return lastAttendanceDiff;
      }
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      return a.name.localeCompare(b.name);
    });
    return sorted;
  }, [leaderboard]);

  const hoursLeadersWithData = useMemo(
    () => hoursLeaderboard.filter((entry) => entry.totalAttendanceMs > 0),
    [hoursLeaderboard]
  );

  const attendanceShowcase = hoursLeadersWithData.slice(0, 5);
  const totalAttendanceMs = useMemo(
    () => leaderboard.reduce((sum, entry) => sum + entry.totalAttendanceMs, 0),
    [leaderboard]
  );
  const totalAttendanceLabel = formatHours(totalAttendanceMs);
  const hoursLeaderEntry = hoursLeadersWithData[0] ?? null;
  const topPointsName =
    leaderboardStats.topMemberName ?? leaderboard[0]?.name ?? null;
  const topHoursName = hoursLeaderEntry?.name ?? null;
  const doubleChampionId =
    leaderboard[0] && hoursLeaderEntry
      ? leaderboard[0].memberId === hoursLeaderEntry.memberId
        ? hoursLeaderEntry.memberId
        : null
      : null;

  const topHoursSet = useMemo(
    () =>
      new Set(hoursLeadersWithData.slice(0, 3).map((entry) => entry.memberId)),
    [hoursLeadersWithData]
  );
  const pointsTopSet = useMemo(
    () => new Set(leaderboard.slice(0, 3).map((entry) => entry.memberId)),
    [leaderboard]
  );

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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
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
              <p className="text-2xl font-light text-emerald-300">
                {totalAttendanceLabel}h
              </p>
              <p className="text-xs text-text-dim uppercase tracking-widest">
                hours tracked
              </p>
            </div>
          </div>
        </div>
        {doubleChampionId && topPointsName ? (
          <div className="relative z-10 mt-4 inline-flex items-center gap-2 rounded-2xl border border-emerald-300/40 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-100 shadow-[0_10px_25px_rgba(16,185,129,0.12)]">
            <Sparkles size={16} className="text-emerald-200" />
            <span>
              double crown:{" "}
              <span className="text-text-primary">{topPointsName}</span> leads
              μpoints & hours!
            </span>
          </div>
        ) : (
          <>
            {topPointsName && (
              <div className="relative z-10 mt-4 text-sm text-text-muted">
                🏆 leading the charge:{" "}
                <span className="text-text-primary">{topPointsName}</span>
              </div>
            )}
            {topHoursName && (
              <div className="relative z-10 mt-2 text-sm text-text-muted flex items-center gap-2">
                <Timer size={16} className="text-emerald-300" />
                <span>
                  hours hero:{" "}
                  <span className="text-text-primary">{topHoursName}</span>
                </span>
              </div>
            )}
          </>
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
                  formatHours={formatHours}
                  isYou={entry.memberId === currentMemberId}
                  isHoursHero={topHoursSet.has(entry.memberId)}
                  isDoubleChampion={doubleChampionId === entry.memberId}
                  onSelect={() => onSelectMember(entry.memberId)}
                />
              ))}
            </div>
          )}

          <AttendanceLeaderboardSection
            entries={attendanceShowcase}
            formatHours={formatHours}
            onSelectMember={onSelectMember}
            currentMemberId={currentMemberId}
            doubleChampionId={doubleChampionId}
            pointsRoyaltyIds={pointsTopSet}
          />

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
                const isYou = entry.memberId === currentMemberId;
                const isHoursHero = topHoursSet.has(entry.memberId);
                const isDoubleChampion = doubleChampionId === entry.memberId;
                const attendanceHoursLabel = formatHours(
                  entry.totalAttendanceMs
                );
                const meetingsLabel =
                  entry.attendanceMeetingsCount === 1 ? "meeting" : "meetings";
                const sessionsLabel =
                  entry.attendanceSessionCount === 1 ? "check-in" : "check-ins";
                const attendanceSummary =
                  entry.totalAttendanceMs > 0
                    ? `${attendanceHoursLabel} hours • ${entry.attendanceMeetingsCount.toLocaleString()} ${meetingsLabel} • ${entry.attendanceSessionCount.toLocaleString()} ${sessionsLabel}`
                    : "no hours tracked yet";
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
                          "border-emerald-300/50 shadow-[0_12px_32px_rgba(16,185,129,0.22)]"
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
                              className={clsx(
                                "border border-white/20",
                                isHoursHero &&
                                  "border-accent-purple/50 shadow-[0_0_18px_rgba(129,140,248,0.35)]",
                                isDoubleChampion &&
                                  "border-emerald-300/70 shadow-[0_0_22px_rgba(16,185,129,0.35)]"
                              )}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap text-text-primary">
                              <h4 className="font-light text-lg">
                                {entry.name}
                              </h4>
                              {isYou && (
                                <span className="text-xs text-sunset-orange bg-sunset-orange-dim px-2 py-0.5 rounded-full">
                                  you
                                </span>
                              )}
                              {isDoubleChampion ? (
                                <span className="text-[11px] uppercase tracking-widest bg-emerald-400/15 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-300/50 flex items-center gap-1">
                                  <Sparkles
                                    size={12}
                                    className="text-emerald-200"
                                  />
                                  double crown
                                </span>
                              ) : (
                                isHoursHero && (
                                  <span className="text-[11px] uppercase tracking-widest bg-accent-purple/15 text-accent-purple px-2 py-0.5 rounded-full border border-accent-purple/40 flex items-center gap-1">
                                    <Timer
                                      size={12}
                                      className="text-accent-purple"
                                    />
                                    hours hero
                                  </span>
                                )
                              )}
                            </div>
                            <p className="text-sm text-text-muted">
                              {entry.email}
                            </p>
                            <p className="text-xs text-text-dim mt-1">
                              {entry.awardsCount === 0
                                ? "no μpoints yet"
                                : `${entry.awardsCount.toLocaleString()} ${
                                    entry.awardsCount === 1 ? "award" : "awards"
                                  } • last awarded ${formatAwardDate(entry.lastAwardedAt)}`}
                            </p>
                            <p className="text-xs text-text-dim mt-2 flex items-center gap-1">
                              <Timer size={14} className="text-emerald-300" />
                              {attendanceSummary}
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
  formatHours,
  isYou,
  isHoursHero,
  isDoubleChampion,
  onSelect,
}: {
  entry: LeaderboardEntry;
  index: number;
  formatPoints: (value: number) => string;
  formatAwardDate: (timestamp: number | null) => string;
  formatHours: (valueMs: number) => string;
  isYou: boolean;
  isHoursHero: boolean;
  isDoubleChampion: boolean;
  onSelect: () => void;
}) {
  const backgroundClass = getSpotlightBackground(index);
  const avatarClassName = clsx(
    "border-2 border-white/50",
    index === 0 &&
      "border-amber-200/80 shadow-[0_0_28px_rgba(251,191,36,0.35)]",
    index === 1 && "border-white/60 shadow-[0_0_22px_rgba(148,163,184,0.35)]",
    index === 2 &&
      "border-sunset-orange/70 shadow-[0_0_22px_rgba(251,146,60,0.35)]",
    isHoursHero &&
      !isDoubleChampion &&
      "border-accent-purple/70 shadow-[0_0_28px_rgba(129,140,248,0.35)]",
    isDoubleChampion &&
      "border-emerald-200/80 shadow-[0_0_38px_rgba(16,185,129,0.45)]"
  );
  const attendanceSummary =
    entry.totalAttendanceMs > 0
      ? `${formatHours(entry.totalAttendanceMs)} hours • ${entry.attendanceMeetingsCount.toLocaleString()} ${
          entry.attendanceMeetingsCount === 1 ? "meeting" : "meetings"
        } • ${entry.attendanceSessionCount.toLocaleString()} ${
          entry.attendanceSessionCount === 1 ? "check-in" : "check-ins"
        }`
      : "no hours tracked yet";
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        "relative overflow-hidden rounded-3xl border border-white/15 p-6 text-left transition-transform hover:-translate-y-1",
        isDoubleChampion &&
          "border-emerald-200/70 shadow-[0_22px_48px_rgba(16,185,129,0.35)]"
      )}
    >
      {isDoubleChampion && (
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 via-transparent to-emerald-500/20" />
      )}
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
                {isDoubleChampion ? (
                  <span className="text-[11px] uppercase tracking-widest bg-emerald-300/30 text-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200/60 flex items-center gap-1">
                    <Sparkles size={14} className="text-emerald-200" />
                    double crown
                  </span>
                ) : (
                  isHoursHero && (
                    <span className="text-[11px] uppercase tracking-widest bg-indigo-300/25 text-white px-2 py-0.5 rounded-full border border-white/30 flex items-center gap-1">
                      <Timer size={14} className="text-white" />
                      hours hero
                    </span>
                  )
                )}
              </div>
              <p className="text-sm text-white/70 mt-1">{entry.email}</p>
              <p className="text-xs text-white/60 mt-2">
                {entry.awardsCount === 0
                  ? "no μpoints yet"
                  : `${entry.awardsCount.toLocaleString()} ${
                      entry.awardsCount === 1 ? "award" : "awards"
                    } • last awarded ${formatAwardDate(entry.lastAwardedAt)}`}
              </p>
              <p className="text-xs text-white/60 mt-2 flex items-center gap-1">
                <Timer size={16} className="text-emerald-200" />
                {attendanceSummary}
              </p>
            </div>
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

function AttendanceLeaderboardSection({
  entries,
  formatHours,
  onSelectMember,
  currentMemberId,
  doubleChampionId,
  pointsRoyaltyIds,
}: {
  entries: Array<LeaderboardEntry>;
  formatHours: (valueMs: number) => string;
  onSelectMember: (memberId: Id<"members">) => void;
  currentMemberId: Id<"members">;
  doubleChampionId: Id<"members"> | null;
  pointsRoyaltyIds: Set<Id<"members">>;
}) {
  const leaderMs = entries[0]?.totalAttendanceMs ?? 0;
  const rankTitles = ["time titan", "momentum maker", "clockwork ace"];

  return (
    <div className="relative overflow-hidden glass-panel mt-6 p-6">
      <div className="absolute inset-0 pointer-events-none opacity-60">
        <div className="absolute -top-24 left-0 h-40 w-40 rounded-full bg-gradient-to-br from-emerald-400/40 via-emerald-300/20 to-transparent blur-3xl" />
        <div className="absolute -bottom-24 right-0 h-48 w-48 rounded-full bg-gradient-to-br from-accent-purple/40 via-indigo-400/30 to-transparent blur-3xl" />
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-2 text-text-primary">
          <Timer size={22} className="text-emerald-300" />
          <h3 className="text-2xl font-light">attendance hours leaderboard</h3>
        </div>
        <p className="text-sm text-text-muted mt-2">
          celebrating the time invested at meetings.
        </p>
        {entries.length === 0 ? (
          <div className="mt-6 text-sm text-text-muted">
            no attendance sessions recorded yet. once meetings are logged, this
            board will glow to honor our timekeepers.
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {entries.map((entry, index) => {
              const rank = index + 1;
              const progressRaw = leaderMs
                ? Math.min(
                    100,
                    Math.max(
                      8,
                      Math.round((entry.totalAttendanceMs / leaderMs) * 100)
                    )
                  )
                : 0;
              const progressWidth = `${progressRaw}%`;
              const isYou = entry.memberId === currentMemberId;
              const isDoubleChampion = doubleChampionId === entry.memberId;
              const isPointsRoyalty = pointsRoyaltyIds.has(entry.memberId);
              const hoursLabel = formatHours(entry.totalAttendanceMs);
              const meetingsLabel =
                entry.attendanceMeetingsCount === 1 ? "meeting" : "meetings";
              const sessionsLabel =
                entry.attendanceSessionCount === 1 ? "check-in" : "check-ins";
              const rankTitle = rankTitles[index] ?? null;
              return (
                <button
                  key={entry.memberId}
                  type="button"
                  onClick={() => onSelectMember(entry.memberId)}
                  className="w-full text-left"
                >
                  <div
                    className={clsx(
                      "card-modern hover:-translate-y-1 transition-transform bg-gradient-to-br from-emerald-500/5 via-transparent to-indigo-500/10",
                      isDoubleChampion &&
                        "border-emerald-300/50 shadow-[0_12px_36px_rgba(16,185,129,0.25)]"
                    )}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-transparent to-emerald-300/10 border border-emerald-400/30 flex items-center justify-center text-sm font-semibold text-emerald-100">
                            #{rank}
                          </div>
                          <ProfileAvatar
                            name={entry.name}
                            imageUrl={entry.profileImageUrl}
                            size="lg"
                            className={clsx(
                              "border border-white/20",
                              isDoubleChampion &&
                                "border-emerald-300/70 shadow-[0_0_24px_rgba(16,185,129,0.45)]",
                              !isDoubleChampion &&
                                "border-accent-purple/40 shadow-[0_0_18px_rgba(129,140,248,0.28)]"
                            )}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap text-text-primary">
                            <h4 className="font-light text-lg text-text-primary">
                              {entry.name}
                            </h4>
                            {rankTitle && (
                              <span className="text-[11px] uppercase tracking-widest bg-emerald-400/20 text-emerald-200 px-2 py-0.5 rounded-full">
                                {rankTitle}
                              </span>
                            )}
                            {isYou && (
                              <span className="text-xs text-emerald-200 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                                you
                              </span>
                            )}
                            {isDoubleChampion ? (
                              <span className="text-[11px] uppercase tracking-widest bg-emerald-300/25 text-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200/50 flex items-center gap-1">
                                <Sparkles
                                  size={12}
                                  className="text-emerald-200"
                                />
                                double crown
                              </span>
                            ) : (
                              isPointsRoyalty && (
                                <span className="text-[11px] uppercase tracking-widest bg-accent-purple/20 text-accent-purple px-2 py-0.5 rounded-full border border-accent-purple/40 flex items-center gap-1">
                                  <Trophy
                                    size={12}
                                    className="text-accent-purple"
                                  />
                                  μpoint royalty
                                </span>
                              )
                            )}
                          </div>
                          <p className="text-sm text-text-muted">
                            {entry.email}
                          </p>
                          <p className="text-xs text-text-dim mt-1 flex items-center gap-1">
                            <Timer size={14} className="text-emerald-300" />
                            {hoursLabel} hours logged
                          </p>
                          <p className="text-xs text-text-dim mt-1">
                            {entry.attendanceMeetingsCount.toLocaleString()}{" "}
                            {meetingsLabel} •{" "}
                            {entry.attendanceSessionCount.toLocaleString()}{" "}
                            {sessionsLabel}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-light text-emerald-200">
                          {hoursLabel}h
                        </p>
                        <p className="text-xs text-text-dim uppercase tracking-widest mt-1">
                          attendance hours
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-300 via-indigo-400 to-accent-purple"
                        style={{ width: progressWidth }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
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
  const DEFAULT_VISIBLE_COUNT = 6;
  const [expandedBountyId, setExpandedBountyId] =
    useState<Id<"bounties"> | null>(null);
  const [isShowingAll, setIsShowingAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!expandedBountyId) return;
    const stillExists = bountyBoard.openBounties.some(
      (bounty) => bounty._id === expandedBountyId
    );
    if (!stillExists) {
      setExpandedBountyId(null);
    }
  }, [expandedBountyId, bountyBoard.openBounties]);

  const filteredBounties = useMemo(() => {
    if (!searchTerm.trim()) {
      return bountyBoard.openBounties;
    }
    const term = searchTerm.trim().toLowerCase();
    return bountyBoard.openBounties.filter((bounty) => {
      const description = bounty.description ?? "";
      return (
        bounty.title.toLowerCase().includes(term) ||
        description.toLowerCase().includes(term) ||
        bounty.createdBy.name.toLowerCase().includes(term)
      );
    });
  }, [bountyBoard.openBounties, searchTerm]);

  const displayedBounties = isShowingAll
    ? filteredBounties
    : filteredBounties.slice(0, DEFAULT_VISIBLE_COUNT);
  const shouldShowToggle = filteredBounties.length > DEFAULT_VISIBLE_COUNT;

  return (
    <div className="space-y-4 mt-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
        <div className="flex items-center gap-2 self-start md:self-auto">
          {(bountyBoard.openBounties.length > 0 || searchTerm.length > 0) && (
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setIsShowingAll(false);
                }}
                placeholder="search bounties"
                className="input-modern pl-9 md:w-64"
              />
            </div>
          )}
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
      </div>

      {filteredBounties.length > 0 && (
        <div className="space-y-2">
          {displayedBounties.map((bounty) => {
            const isExpanded = expandedBountyId === bounty._id;
            return (
              <div
                key={bounty._id}
                className={clsx(
                  "relative overflow-hidden rounded-2xl border border-border-glass bg-glass transition-shadow",
                  isExpanded &&
                    "ring-1 ring-accent-purple/40 shadow-[0_20px_45px_rgba(129,140,248,0.18)]"
                )}
              >
                <div className="absolute inset-0 opacity-60 pointer-events-none">
                  <div className="absolute -top-16 -left-12 h-36 w-36 rounded-full bg-gradient-to-br from-accent-purple/30 via-pink-500/25 to-transparent blur-3xl" />
                  <div className="absolute -bottom-16 -right-12 h-36 w-36 rounded-full bg-gradient-to-br from-sunset-orange/30 via-amber-300/25 to-transparent blur-3xl" />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setExpandedBountyId((current) =>
                      current === bounty._id ? null : bounty._id
                    )
                  }
                  className="relative z-10 w-full text-left p-4 flex flex-col gap-3"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-base font-light text-text-primary">
                        {bounty.title}
                      </p>
                      <p className="text-xs text-text-dim mt-1">
                        posted by {bounty.createdBy.name} ·{" "}
                        {formatDateTime(bounty.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="inline-flex items-center gap-2 rounded-xl px-3 py-1 bg-gradient-to-r from-accent-purple/20 via-pink-500/20 to-sunset-orange/20 border border-white/10">
                        <Sparkles size={16} className="text-sunset-orange" />
                        <span className="text-sm font-light text-text-primary">
                          +{formatPoints(bounty.points)} μpoints
                        </span>
                      </div>
                      <ChevronDown
                        size={18}
                        className={clsx(
                          "text-text-muted transition-transform",
                          isExpanded && "rotate-180"
                        )}
                      />
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-white/10 pt-3">
                      {bounty.description ? (
                        <p className="text-sm text-text-muted leading-relaxed">
                          {bounty.description}
                        </p>
                      ) : (
                        <p className="text-xs text-text-dim">
                          no extra notes provided for this bounty.
                        </p>
                      )}
                      {canManageBounties && (
                        <div className="flex justify-end mt-4">
                          <button
                            type="button"
                            className="btn-modern btn-primary flex items-center gap-2 px-4 py-2"
                            onClick={(event) => {
                              event.stopPropagation();
                              onClickComplete(bounty);
                            }}
                          >
                            <CheckCircle2 size={18} /> mark complete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </button>
              </div>
            );
          })}
          {shouldShowToggle && !isShowingAll && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                className="btn-modern px-5 py-2 text-xs font-mono uppercase tracking-widest text-text-secondary"
                onClick={() => setIsShowingAll(true)}
              >
                show all bounties
              </button>
            </div>
          )}
          {shouldShowToggle && isShowingAll && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                className="btn-modern px-5 py-2 text-xs font-mono uppercase tracking-widest text-text-secondary"
                onClick={() => setIsShowingAll(false)}
              >
                show less
              </button>
            </div>
          )}
        </div>
      )}
      {filteredBounties.length === 0 && bountyBoard.openBounties.length > 0 && (
        <div className="glass-panel p-6 text-center text-sm text-text-muted">
          no bounties match “{searchTerm}”.
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
