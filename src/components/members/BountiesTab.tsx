import { useState, useMemo } from "react";
import { type Id } from "../../../convex/_generated/dataModel";
import { BountyBoardData, BountyEntry } from "./types";
import { MemberWithProfile } from "../../lib/members";
import { formatDateTime } from "./helpers";
import { cn } from "../../lib/utils";
import { Button, SearchInput, Badge, EmptyState } from "../ui";
import { ProfileAvatar } from "../ProfileAvatar";
import {
  Target,
  CheckCircle2,
  Sparkles,
  Clock,
  Trophy,
  Plus,
  Search,
  Filter,
  ChevronDown,
  User,
  Calendar,
  Award,
} from "lucide-react";
import { CreateBountyModal, CompleteBountyModal } from "./leaderboard";

export interface BountiesTabProps {
  bountyBoard: BountyBoardData;
  members: MemberWithProfile[];
  canManageBounties: boolean;
  formatPoints: (value: number) => string;
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

type BountyView = "open" | "completed";

export function BountiesTab({
  bountyBoard,
  members,
  canManageBounties,
  formatPoints,
  onCreateBounty,
  onCompleteBounty,
  isCreatingBounty,
  completingBountyId,
}: BountiesTabProps) {
  const [view, setView] = useState<BountyView>("open");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedBounty, setSelectedBounty] = useState<BountyEntry | null>(null);
  const [expandedBountyId, setExpandedBountyId] = useState<Id<"bounties"> | null>(null);

  // Filter bounties
  const filteredOpenBounties = useMemo(() => {
    if (!searchTerm.trim()) return bountyBoard.openBounties;
    const term = searchTerm.toLowerCase();
    return bountyBoard.openBounties.filter(
      (b) =>
        b.title.toLowerCase().includes(term) ||
        b.description?.toLowerCase().includes(term) ||
        b.createdBy.name.toLowerCase().includes(term)
    );
  }, [bountyBoard.openBounties, searchTerm]);

  const filteredCompletedBounties = useMemo(() => {
    if (!searchTerm.trim()) return bountyBoard.recentlyCompleted;
    const term = searchTerm.toLowerCase();
    return bountyBoard.recentlyCompleted.filter(
      (b) =>
        b.title.toLowerCase().includes(term) ||
        b.description?.toLowerCase().includes(term) ||
        b.completedBy?.name.toLowerCase().includes(term)
    );
  }, [bountyBoard.recentlyCompleted, searchTerm]);

  // Stats
  const totalOpenPoints = useMemo(
    () => bountyBoard.openBounties.reduce((sum, b) => sum + b.points, 0),
    [bountyBoard.openBounties]
  );

  const totalCompletedPoints = useMemo(
    () => bountyBoard.recentlyCompleted.reduce((sum, b) => sum + b.points, 0),
    [bountyBoard.recentlyCompleted]
  );

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="bg-bg-secondary border border-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Target size={20} className="text-accent" />
              <h2 className="text-lg font-semibold text-text-primary">Bounty Board</h2>
            </div>
            <p className="text-sm text-text-muted mt-1">
              Complete bounties to earn points
            </p>
          </div>

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

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border-subtle">
          <div className="bg-bg-tertiary rounded-lg p-3 text-center">
            <div className="text-xl font-semibold text-accent">
              {bountyBoard.openBounties.length}
            </div>
            <div className="text-xs text-text-muted">Open</div>
          </div>
          <div className="bg-bg-tertiary rounded-lg p-3 text-center">
            <div className="text-xl font-semibold text-accent-orange">
              {formatPoints(totalOpenPoints)}
            </div>
            <div className="text-xs text-text-muted">Available Points</div>
          </div>
          <div className="bg-bg-tertiary rounded-lg p-3 text-center">
            <div className="text-xl font-semibold text-accent-success">
              {bountyBoard.recentlyCompleted.length}
            </div>
            <div className="text-xs text-text-muted">Completed</div>
          </div>
          <div className="bg-bg-tertiary rounded-lg p-3 text-center">
            <div className="text-xl font-semibold text-accent-success">
              {formatPoints(totalCompletedPoints)}
            </div>
            <div className="text-xs text-text-muted">Points Awarded</div>
          </div>
        </div>
      </div>

      {/* View Toggle & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex rounded-lg border border-border overflow-hidden bg-bg-tertiary">
          <button
            onClick={() => setView("open")}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2",
              view === "open"
                ? "bg-accent text-white"
                : "text-text-muted hover:text-text-primary"
            )}
          >
            <Target size={14} />
            Open
            {bountyBoard.openBounties.length > 0 && (
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-xs",
                view === "open" ? "bg-white/20" : "bg-bg-secondary"
              )}>
                {bountyBoard.openBounties.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setView("completed")}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2",
              view === "completed"
                ? "bg-accent text-white"
                : "text-text-muted hover:text-text-primary"
            )}
          >
            <CheckCircle2 size={14} />
            Completed
            {bountyBoard.recentlyCompleted.length > 0 && (
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-xs",
                view === "completed" ? "bg-white/20" : "bg-bg-secondary"
              )}>
                {bountyBoard.recentlyCompleted.length}
              </span>
            )}
          </button>
        </div>

        <SearchInput
          placeholder="Search bounties..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onClear={() => setSearchTerm("")}
          className="flex-1"
        />
      </div>

      {/* Bounties List */}
      {view === "open" ? (
        filteredOpenBounties.length === 0 ? (
          <div className="bg-bg-secondary border border-border rounded-xl p-12 text-center">
            {bountyBoard.openBounties.length === 0 ? (
              <>
                <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto mb-4">
                  <Target size={32} className="text-text-muted" />
                </div>
                <h3 className="text-lg font-medium text-text-primary mb-2">
                  No bounties yet
                </h3>
                <p className="text-sm text-text-muted mb-4">
                  Bounties are tasks that earn team members points when completed.
                </p>
                {canManageBounties && (
                  <Button
                    variant="primary"
                    icon={<Plus size={16} />}
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    Create First Bounty
                  </Button>
                )}
              </>
            ) : (
              <>
                <Search size={24} className="text-text-muted mx-auto mb-3" />
                <p className="text-sm text-text-muted">
                  No bounties match "{searchTerm}"
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOpenBounties.map((bounty) => {
              const isExpanded = expandedBountyId === bounty._id;

              return (
                <div
                  key={bounty._id}
                  className="bg-bg-secondary border border-border rounded-xl overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedBountyId((current) =>
                        current === bounty._id ? null : bounty._id
                      )
                    }
                    className={cn(
                      "w-full text-left p-4 transition-colors hover:bg-bg-tertiary",
                      isExpanded && "bg-bg-tertiary"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      {/* Points Badge */}
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent-orange/10 border border-accent-orange/20">
                          <Sparkles size={16} className="text-accent-orange" />
                          <span className="text-lg font-semibold text-accent-orange">
                            +{formatPoints(bounty.points)}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-text-primary">
                          {bounty.title}
                        </h3>
                        {bounty.description && (
                          <p className="text-sm text-text-muted mt-1 line-clamp-2">
                            {bounty.description}
                          </p>
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

                      {/* Expand Indicator */}
                      <ChevronDown
                        size={16}
                        className={cn(
                          "text-text-muted transition-transform shrink-0",
                          isExpanded && "rotate-180"
                        )}
                      />
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4">
                      <div className="bg-bg-primary rounded-lg p-4 border border-border-subtle">
                        {bounty.description ? (
                          <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                            {bounty.description}
                          </p>
                        ) : (
                          <p className="text-sm text-text-muted italic">
                            No additional details provided.
                          </p>
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
      ) : (
        // Completed View
        filteredCompletedBounties.length === 0 ? (
          <div className="bg-bg-secondary border border-border rounded-xl p-12 text-center">
            {bountyBoard.recentlyCompleted.length === 0 ? (
              <>
                <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto mb-4">
                  <Award size={32} className="text-text-muted" />
                </div>
                <h3 className="text-lg font-medium text-text-primary mb-2">
                  No completed bounties yet
                </h3>
                <p className="text-sm text-text-muted">
                  Completed bounties will appear here.
                </p>
              </>
            ) : (
              <>
                <Search size={24} className="text-text-muted mx-auto mb-3" />
                <p className="text-sm text-text-muted">
                  No completed bounties match "{searchTerm}"
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCompletedBounties.map((bounty) => (
              <div
                key={bounty._id}
                className="bg-bg-secondary border border-border rounded-xl p-4"
              >
                <div className="flex items-start gap-4">
                  {/* Completed Badge */}
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent-success/10 border border-accent-success/20 shrink-0">
                    <CheckCircle2 size={16} className="text-accent-success" />
                    <span className="text-lg font-semibold text-accent-success">
                      +{formatPoints(bounty.points)}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-text-primary">
                      {bounty.title}
                    </h3>
                    {bounty.completionNotes && (
                      <p className="text-sm text-text-muted mt-1">
                        {bounty.completionNotes}
                      </p>
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

      {/* Modals */}
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
