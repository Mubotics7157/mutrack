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
  Timer,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import {
  AttendanceLeaderboardEntry,
  BountyBoardData,
  LeaderboardEntry,
  BountyEntry,
} from "./types";
import {
  formatDateTime,
  formatAwardDate as formatAwardDateFn,
  formatPoints as formatPointsFn,
  formatDuration,
} from "./../members/helpers";
import { MemberWithProfile } from "../../lib/members";
import { ProfileAvatar } from "../ProfileAvatar";

const MS_PER_HOUR = 1000 * 60 * 60;

export interface LeaderboardTabProps {
  leaderboard: Array<LeaderboardEntry>;
  leaderboardStats: {
    totalPoints: number;
    totalAwards: number;
    topMemberName: string | null;
  };
  attendanceLeaderboard: Array<AttendanceLeaderboardEntry>;
  attendanceStats: {
    totalHours: number;
    totalSessions: number;
    topMemberName: string | null;
  };
  onSelectMember: (memberId: Id<"members">) => void;
  currentMemberId: Id<"members">;
  formatPoints?: (value: number) => string;
  formatAwardDate?: (timestamp: number | null) => string;
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
    attendanceLeaderboard,
    attendanceStats,
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
  const formatHoursValue = (durationMs: number) =>
    formatPoints(durationMs / MS_PER_HOUR);

  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);
  const leaderPoints = leaderboard[0]?.totalPoints ?? 0;
  const attendanceTopThree = attendanceLeaderboard.slice(0, 3);
  const attendanceRest = attendanceLeaderboard.slice(3);
  const attendanceLeaderMs = attendanceLeaderboard[0]?.totalDurationMs ?? 0;

  const pointsTopIds = new Set(topThree.map((entry) => entry.memberId));
  const attendanceTopIds = new Set(
    attendanceTopThree.map((entry) => entry.memberId)
  );
  const overlappingTopIds = new Set<Id<"members">>();
  for (const id of pointsTopIds) {
    if (attendanceTopIds.has(id)) {
      overlappingTopIds.add(id);
    }
  }
  const doubleChampionId =
    leaderboard[0] &&
    attendanceLeaderboard[0] &&
    leaderboard[0].memberId === attendanceLeaderboard[0].memberId
      ? leaderboard[0].memberId
      : null;
  const doubleChampionEntry = doubleChampionId
    ? leaderboard.find((entry) => entry.memberId === doubleChampionId)
    : null;

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
              <h2 className="text-2xl font-light">team leaderboard lounge</h2>
            </div>
            <p className="text-sm text-text-muted mt-2">
              {canAwardPoints
                ? "celebrate μpoints triumphs, crown hours heroes, and tap anyone to spotlight or award them."
                : "peek at μpoints triumphs and hours heroes from across the team."}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
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
                {formatPoints(attendanceStats.totalHours)}
              </p>
              <p className="text-xs text-text-dim uppercase tracking-widest">
                hours tracked
              </p>
            </div>
            <div>
              <p className="text-2xl font-light text-emerald-200">
                {attendanceStats.totalSessions.toLocaleString()}
              </p>
              <p className="text-xs text-text-dim uppercase tracking-widest">
                check-ins
              </p>
            </div>
          </div>
        </div>
        <div className="relative z-10 mt-4 space-y-1 text-sm text-text-muted">
          {doubleChampionEntry ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-emerald-200">
              <Sparkles size={16} className="text-emerald-300" />
              <span>
                double crown: <span className="text-emerald-100">{doubleChampionEntry.name}</span> leads μpoints and hours!
              </span>
            </div>
          ) : (
            <>
              {leaderboardStats.topMemberName && (
                <div>
                  🏆 μpoints frontrunner:{" "}
                  <span className="text-text-primary">
                    {leaderboardStats.topMemberName}
                  </span>
                </div>
              )}
              {attendanceStats.topMemberName && (
                <div>
                  ⏱ hours hero:{" "}
                  <span className="text-text-primary">
                    {attendanceStats.topMemberName}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {leaderboard.length === 0 && attendanceLeaderboard.length === 0 ? (
        <div className="glass-panel p-8 text-center">
          <p className="text-text-muted">
            no μpoints or attendance hours logged yet. once recognitions or
            check-ins roll in, both leaderboards will sparkle here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-text-secondary">
              <Trophy size={18} className="text-sunset-orange" />
              <h3 className="text-sm font-mono uppercase tracking-widest">
                μpoint legends
              </h3>
            </div>
            {topThree.length > 0 ? (
              <div className="space-y-4">
                {topThree.map((entry, index) => (
                  <SpotlightCard
                    key={entry.memberId}
                    entry={entry}
                    index={index}
                    formatPoints={formatPoints}
                    formatAwardDate={formatAwardDate}
                    isYou={entry.memberId === currentMemberId}
                    isDualLegend={entry.memberId === doubleChampionId}
                    isDualTop={overlappingTopIds.has(entry.memberId)}
                    onSelect={() => onSelectMember(entry.memberId)}
                  />
                ))}
              </div>
            ) : (
              <div className="card-modern text-center text-text-muted">
                no μpoints have been awarded yet. start celebrating teammates to
                light up this board.
              </div>
            )}
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
                  const isDual = overlappingTopIds.has(entry.memberId);
                  const isLegend = entry.memberId === doubleChampionId;
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
                          isLegend &&
                            "border-emerald-300/60 shadow-[0_8px_40px_rgba(16,185,129,0.25)]"
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
                                {isLegend && (
                                  <span className="text-xs text-emerald-200 bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 rounded-full">
                                    double crown
                                  </span>
                                )}
                                {!isLegend && isDual && (
                                  <span className="text-xs text-accent-purple bg-accent-purple/15 border border-accent-purple/30 px-2 py-0.5 rounded-full">
                                    dual leaderboard
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
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-text-secondary">
              <Timer size={18} className="text-emerald-300" />
              <h3 className="text-sm font-mono uppercase tracking-widest">
                hours heroes
              </h3>
            </div>
            {attendanceTopThree.length > 0 ? (
              <div className="space-y-4">
                {attendanceTopThree.map((entry, index) => (
                  <HoursSpotlightCard
                    key={entry.memberId}
                    entry={entry}
                    index={index}
                    formatHoursValue={formatHoursValue}
                    isYou={entry.memberId === currentMemberId}
                    isDualLegend={entry.memberId === doubleChampionId}
                    isDualTop={overlappingTopIds.has(entry.memberId)}
                    onSelect={() => onSelectMember(entry.memberId)}
                  />
                ))}
              </div>
            ) : (
              <div className="card-modern text-center text-text-muted">
                no attendance sessions have been tracked yet. once scanners hum,
                the hours heroes will appear here.
              </div>
            )}
            {attendanceRest.length > 0 && (
              <div className="space-y-3">
                {attendanceRest.map((entry, index) => {
                  const absoluteRank = index + attendanceTopThree.length;
                  const progressRaw = attendanceLeaderMs
                    ? Math.min(
                        100,
                        Math.max(
                          6,
                          Math.round(
                            (entry.totalDurationMs / attendanceLeaderMs) * 100
                          )
                        )
                      )
                    : 0;
                  const progressWidth = `${progressRaw}%`;
                  const isDual = overlappingTopIds.has(entry.memberId);
                  const isLegend = entry.memberId === doubleChampionId;
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
                          isLegend &&
                            "border-emerald-300/60 shadow-[0_8px_40px_rgba(16,185,129,0.25)]"
                        )}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-400/10 to-transparent border border-emerald-300/40 flex items-center justify-center text-sm font-semibold text-emerald-200">
                                #{absoluteRank + 1}
                              </div>
                              <ProfileAvatar
                                name={entry.name}
                                imageUrl={entry.profileImageUrl}
                                size="lg"
                                className="border border-emerald-200/40"
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap text-text-primary">
                                <h4 className="font-light text-lg">
                                  {entry.name}
                                </h4>
                                {entry.memberId === currentMemberId && (
                                  <span className="text-xs text-emerald-200 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                                    you
                                  </span>
                                )}
                                {isLegend && (
                                  <span className="text-xs text-emerald-200 bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 rounded-full">
                                    double crown
                                  </span>
                                )}
                                {!isLegend && isDual && (
                                  <span className="text-xs text-accent-purple bg-accent-purple/15 border border-accent-purple/30 px-2 py-0.5 rounded-full">
                                    dual leaderboard
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-text-muted">
                                {entry.email}
                              </p>
                              <p className="text-xs text-text-dim mt-1">
                                {entry.meetingsAttended === 0
                                  ? "no attendance logged"
                                  : `${entry.meetingsAttended} ${entry.meetingsAttended === 1 ? "meeting" : "meetings"} • ${entry.sessionsCount} ${entry.sessionsCount === 1 ? "check-in" : "check-ins"}`}
                              </p>
                              <p className="text-xs text-text-dim">
                                {entry.lastAttendanceAt
                                  ? `last seen ${formatDateTime(entry.lastAttendanceAt)}`
                                  : "awaiting first check-in"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-light text-emerald-300">
                              {formatHoursValue(entry.totalDurationMs)}h
                            </p>
                            <p className="text-xs text-text-dim uppercase tracking-widest mt-1">
                              logged time
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 h-2 rounded-full bg-emerald-500/10 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-400 via-cyan-300 to-sky-400"
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
  isDualLegend,
  isDualTop,
  onSelect,
}: {
  entry: LeaderboardEntry;
  index: number;
  formatPoints: (value: number) => string;
  formatAwardDate: (timestamp: number | null) => string;
  isYou: boolean;
  isDualLegend: boolean;
  isDualTop: boolean;
  onSelect: () => void;
}) {
  const backgroundClass = getSpotlightBackground(index);
  const avatarClassName = clsx(
    "border-2 border-white/50",
    index === 0 && "border-amber-200/80 shadow-[0_0_28px_rgba(251,191,36,0.35)]",
    index === 1 && "border-white/60 shadow-[0_0_22px_rgba(148,163,184,0.35)]",
    index === 2 && "border-sunset-orange/70 shadow-[0_0_22px_rgba(251,146,60,0.35)]",
    isDualLegend && "ring-4 ring-emerald-300/40"
  );
  const containerClass = clsx(
    "relative overflow-hidden rounded-3xl border border-white/15 p-6 text-left transition-transform hover:-translate-y-1",
    isDualLegend &&
      "border-emerald-300/60 shadow-[0_12px_48px_rgba(16,185,129,0.35)]"
  );
  return (
    <button type="button" onClick={onSelect} className={containerClass}>
      <div className={clsx("absolute inset-0 opacity-80", backgroundClass)} />
      {isDualLegend && (
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 via-transparent to-emerald-400/20" />
      )}
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
                {isDualLegend && (
                  <span className="text-xs text-emerald-200 bg-emerald-500/30 border border-emerald-300/50 px-2 py-0.5 rounded-full">
                    double crown
                  </span>
                )}
                {!isDualLegend && isDualTop && (
                  <span className="text-xs text-accent-purple bg-accent-purple/20 border border-accent-purple/40 px-2 py-0.5 rounded-full">
                    dual leaderboard
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
          </div>
          <div className="relative">
            {index === 0 ? (
              <Crown size={32} className="text-amber-200 drop-shadow-lg" />
            ) : (
              <Trophy size={28} className="text-white/80" />
            )}
            {isDualLegend && (
              <Sparkles className="absolute -top-2 -right-3 text-emerald-200 animate-pulse" size={18} />
            )}
          </div>
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

function HoursSpotlightCard({
  entry,
  index,
  formatHoursValue,
  isYou,
  isDualLegend,
  isDualTop,
  onSelect,
}: {
  entry: AttendanceLeaderboardEntry;
  index: number;
  formatHoursValue: (durationMs: number) => string;
  isYou: boolean;
  isDualLegend: boolean;
  isDualTop: boolean;
  onSelect: () => void;
}) {
  const backgroundClass = getHoursSpotlightBackground(index);
  const avatarClassName = clsx(
    "border-2 border-emerald-200/60",
    index === 0 && "border-emerald-100/90 shadow-[0_0_28px_rgba(110,231,183,0.35)]",
    index === 1 && "border-teal-100/70 shadow-[0_0_22px_rgba(94,234,212,0.35)]",
    index === 2 && "border-cyan-200/70 shadow-[0_0_22px_rgba(165,243,252,0.35)]",
    isDualLegend && "ring-4 ring-emerald-300/40"
  );
  const containerClass = clsx(
    "relative overflow-hidden rounded-3xl border border-emerald-200/20 p-6 text-left transition-transform hover:-translate-y-1",
    isDualLegend &&
      "border-emerald-300/60 shadow-[0_12px_48px_rgba(16,185,129,0.35)]"
  );
  return (
    <button type="button" onClick={onSelect} className={containerClass}>
      <div className={clsx("absolute inset-0 opacity-80", backgroundClass)} />
      {isDualLegend && (
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 via-transparent to-emerald-400/20" />
      )}
      <div className="relative z-10 flex flex-col h-full justify-between gap-6 text-emerald-50">
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
                <span className="badge bg-emerald-900/40 border-emerald-100/40 text-emerald-100">
                  #{index + 1}
                </span>
                {isYou && (
                  <span className="text-xs bg-emerald-900/40 text-emerald-100 px-2 py-0.5 rounded-full">
                    you
                  </span>
                )}
                {isDualLegend && (
                  <span className="text-xs text-emerald-100 bg-emerald-500/30 border border-emerald-300/50 px-2 py-0.5 rounded-full">
                    double crown
                  </span>
                )}
                {!isDualLegend && isDualTop && (
                  <span className="text-xs text-accent-purple bg-accent-purple/30 border border-accent-purple/40 px-2 py-0.5 rounded-full">
                    dual leaderboard
                  </span>
                )}
              </div>
              <p className="text-sm text-emerald-100/80 mt-1">{entry.email}</p>
              <p className="text-xs text-emerald-100/70 mt-2">
                {entry.meetingsAttended === 0
                  ? "no attendance logged yet"
                  : `${entry.meetingsAttended} ${entry.meetingsAttended === 1 ? "meeting" : "meetings"} • ${entry.sessionsCount} ${entry.sessionsCount === 1 ? "check-in" : "check-ins"}`}
              </p>
              <p className="text-xs text-emerald-100/60">
                {entry.lastAttendanceAt
                  ? `last seen ${formatDateTime(entry.lastAttendanceAt)}`
                  : "awaiting first check-in"}
              </p>
            </div>
          </div>
          <div className="relative">
            {index === 0 ? (
              <Timer size={32} className="text-emerald-100 drop-shadow-lg" />
            ) : (
              <Sparkles size={26} className="text-emerald-100" />
            )}
            {isDualLegend && (
              <Sparkles className="absolute -top-2 -right-3 text-emerald-100 animate-pulse" size={16} />
            )}
          </div>
        </div>
        <div>
          <p className="text-4xl font-light drop-shadow-lg">
            {formatHoursValue(entry.totalDurationMs)}h
          </p>
          <p className="text-xs uppercase tracking-widest text-emerald-100/80 mt-1">
            logged this season
          </p>
          <p className="text-xs text-emerald-100/70 mt-1">
            {formatDuration(entry.totalDurationMs)} on-site
          </p>
        </div>
      </div>
    </button>
  );
}

function getHoursSpotlightBackground(index: number) {
  switch (index) {
    case 0:
      return "bg-gradient-to-br from-emerald-400 via-emerald-500/80 to-cyan-400/80";
    case 1:
      return "bg-gradient-to-br from-cyan-400/70 via-sky-400/60 to-transparent";
    case 2:
      return "bg-gradient-to-br from-teal-400/60 via-emerald-300/50 to-transparent";
    default:
      return "bg-gradient-to-br from-emerald-200/20 to-transparent";
  }
}
