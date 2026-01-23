import { useMemo, useState } from 'react';
import { type Id } from '../../../convex/_generated/dataModel';
import { BountyBoardData, LeaderboardEntry, LeaderboardRange, BountyEntry } from './types';
import {
  formatAwardDate as formatAwardDateFn,
  formatPoints as formatPointsFn,
  formatHours as formatHoursFn,
} from './helpers';
import { MemberWithProfile } from '../../lib/members';
import {
  LeaderboardHeader,
  SpotlightCard,
  LeaderboardRow,
  AttendanceLeaderboard,
  BountyBoard,
  CreateBountyModal,
  CompleteBountyModal,
} from './leaderboard';

export interface LeaderboardTabProps {
  leaderboard: Array<LeaderboardEntry>;
  leaderboardStats: {
    totalPoints: number;
    totalAwards: number;
    topMemberName: string | null;
  };
  leaderboardRange: LeaderboardRange;
  onSelectRange: (range: LeaderboardRange) => void;
  onSelectMember: (memberId: Id<'members'>) => void;
  currentMemberId: Id<'members'>;
  isLoading: boolean;
  formatPoints?: (value: number) => string;
  formatAwardDate?: (timestamp: number | null) => string;
  formatHours?: (valueMs: number) => string;
  canAwardPoints: boolean;
  bountyBoard: BountyBoardData;
  members: Array<MemberWithProfile>;
  canManageBounties: boolean;
  onCreateBounty: (input: { title: string; description: string | null; points: number }) => Promise<boolean>;
  onCompleteBounty: (input: { bountyId: Id<'bounties'>; memberId: Id<'members'>; notes: string | null }) => Promise<boolean>;
  isCreatingBounty: boolean;
  completingBountyId: Id<'bounties'> | null;
}

export function LeaderboardTab(props: LeaderboardTabProps) {
  const {
    leaderboard,
    leaderboardStats,
    leaderboardRange,
    onSelectRange,
    onSelectMember,
    currentMemberId,
    isLoading,
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

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedBounty, setSelectedBounty] = useState<BountyEntry | null>(null);

  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);
  const leaderPoints = leaderboard[0]?.totalPoints ?? 0;

  const hoursLeaderboard = useMemo(() => {
    const sorted = [...leaderboard];
    sorted.sort((a, b) => {
      if (b.totalAttendanceMs !== a.totalAttendanceMs) return b.totalAttendanceMs - a.totalAttendanceMs;
      const lastAttendanceDiff = (b.lastAttendanceAt ?? 0) - (a.lastAttendanceAt ?? 0);
      if (lastAttendanceDiff !== 0) return lastAttendanceDiff;
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
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
  const hoursLeaderEntry = hoursLeadersWithData[0] ?? null;

  const topPointsName = leaderboardStats.topMemberName ?? leaderboard[0]?.name ?? null;
  const topHoursName = hoursLeaderEntry?.name ?? null;
  const doubleChampionId =
    leaderboard[0] && hoursLeaderEntry
      ? leaderboard[0].memberId === hoursLeaderEntry.memberId
        ? hoursLeaderEntry.memberId
        : null
      : null;

  const topHoursSet = useMemo(
    () => new Set(hoursLeadersWithData.slice(0, 3).map((entry) => entry.memberId)),
    [hoursLeadersWithData]
  );
  const pointsTopSet = useMemo(() => new Set(leaderboard.slice(0, 3).map((entry) => entry.memberId)), [leaderboard]);

  const showEmptyState = !isLoading && leaderboard.length === 0;
  const displayTotalPoints = isLoading ? '—' : formatPoints(leaderboardStats.totalPoints);
  const displayTotalAwards = isLoading ? '—' : leaderboardStats.totalAwards.toLocaleString();
  const displayAttendanceLabel = isLoading ? '—' : `${formatHours(totalAttendanceMs)}h`;

  return (
    <div className="space-y-6">
      <LeaderboardHeader
        leaderboardRange={leaderboardRange}
        onSelectRange={onSelectRange}
        displayTotalPoints={displayTotalPoints}
        displayTotalAwards={displayTotalAwards}
        displayAttendanceLabel={displayAttendanceLabel}
        topPointsName={topPointsName}
        topHoursName={topHoursName}
        doubleChampionId={doubleChampionId}
        canAwardPoints={canAwardPoints}
      />

      {showEmptyState ? (
        <div className="glass-panel p-8 text-center">
          <p className="text-text-muted">
            no μpoints have been awarded yet. once recognitions are logged, the leaderboard will sparkle here.
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

          <AttendanceLeaderboard
            entries={attendanceShowcase}
            formatHours={formatHours}
            onSelectMember={onSelectMember}
            currentMemberId={currentMemberId}
            doubleChampionId={doubleChampionId}
            pointsRoyaltyIds={pointsTopSet}
          />

          <BountyBoard
            bountyBoard={bountyBoard}
            canManageBounties={canManageBounties}
            formatPoints={formatPoints}
            onClickCreate={() => setIsCreateModalOpen(true)}
            onClickComplete={(b) => setSelectedBounty(b)}
          />

          {rest.length > 0 && (
            <div className="space-y-3">
              {rest.map((entry, index) => (
                <LeaderboardRow
                  key={entry.memberId}
                  entry={entry}
                  rank={index + topThree.length + 1}
                  leaderPoints={leaderPoints}
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
        </>
      )}

      <CreateBountyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={onCreateBounty}
        isCreating={isCreatingBounty}
      />

      <CompleteBountyModal
        bounty={selectedBounty}
        members={members}
        onClose={() => setSelectedBounty(null)}
        onComplete={onCompleteBounty}
        completingBountyId={completingBountyId}
        formatPoints={formatPoints}
      />
    </div>
  );
}
