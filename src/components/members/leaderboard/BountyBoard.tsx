import { useState, useMemo, useEffect } from 'react';
import { ClipboardList, Search, Target, CheckCircle2, ChevronDown, Sparkles } from 'lucide-react';
import { BountyBoardData, BountyEntry } from '../types';
import { formatDateTime } from '../helpers';
import { type Id } from '../../../../convex/_generated/dataModel';
import { cn } from '../../../lib/utils';
import { Button, SearchInput, Badge } from '../../ui';

interface BountyBoardProps {
  bountyBoard: BountyBoardData;
  canManageBounties: boolean;
  formatPoints: (value: number) => string;
  onClickCreate: () => void;
  onClickComplete: (bounty: BountyEntry) => void;
}

const DEFAULT_VISIBLE_COUNT = 6;

export function BountyBoard({
  bountyBoard,
  canManageBounties,
  formatPoints,
  onClickCreate,
  onClickComplete,
}: BountyBoardProps) {
  const [expandedBountyId, setExpandedBountyId] = useState<Id<'bounties'> | null>(null);
  const [isShowingAll, setIsShowingAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!expandedBountyId) return;
    const stillExists = bountyBoard.openBounties.some((bounty) => bounty._id === expandedBountyId);
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
      const description = bounty.description ?? '';
      return (
        bounty.title.toLowerCase().includes(term) ||
        description.toLowerCase().includes(term) ||
        bounty.createdBy.name.toLowerCase().includes(term)
      );
    });
  }, [bountyBoard.openBounties, searchTerm]);

  const displayedBounties = isShowingAll ? filteredBounties : filteredBounties.slice(0, DEFAULT_VISIBLE_COUNT);
  const shouldShowToggle = filteredBounties.length > DEFAULT_VISIBLE_COUNT;

  return (
    <section className="mt-6 bg-bg-secondary border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-subtle">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardList size={20} className="text-accent" />
              <h3 className="text-lg font-semibold text-text-primary">Open Bounties</h3>
              {bountyBoard.openBounties.length > 0 && (
                <Badge variant="default">{bountyBoard.openBounties.length}</Badge>
              )}
            </div>
            <p className="text-sm text-text-muted mt-1">
              {bountyBoard.openBounties.length === 0
                ? 'No bounties yet — post one to get things rolling'
                : 'Complete a bounty to earn μpoints'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(bountyBoard.openBounties.length > 0 || searchTerm.length > 0) && (
              <SearchInput
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsShowingAll(false);
                }}
                placeholder="Search bounties..."
                className="w-48"
              />
            )}
            {canManageBounties && (
              <Button
                variant="secondary"
                size="sm"
                icon={<Target size={16} />}
                onClick={onClickCreate}
              >
                Post Bounty
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {filteredBounties.length > 0 ? (
        <div className="divide-y divide-border-subtle">
          {displayedBounties.map((bounty) => {
            const isExpanded = expandedBountyId === bounty._id;
            return (
              <div key={bounty._id}>
                <button
                  type="button"
                  onClick={() => setExpandedBountyId((current) => (current === bounty._id ? null : bounty._id))}
                  className={cn(
                    'w-full text-left p-4 transition-colors hover:bg-bg-tertiary',
                    isExpanded && 'bg-bg-tertiary'
                  )}
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-text-primary">{bounty.title}</p>
                      <p className="text-xs text-text-muted mt-1">
                        Posted by {bounty.createdBy.name} · {formatDateTime(bounty.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20">
                        <Sparkles size={14} className="text-accent-orange" />
                        <span className="text-sm font-medium text-accent-orange">
                          +{formatPoints(bounty.points)}
                        </span>
                      </div>
                      <ChevronDown
                        size={16}
                        className={cn('text-text-muted transition-transform', isExpanded && 'rotate-180')}
                      />
                    </div>
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="bg-bg-tertiary rounded-lg p-4 border border-border-subtle">
                      {bounty.description ? (
                        <p className="text-sm text-text-secondary leading-relaxed">{bounty.description}</p>
                      ) : (
                        <p className="text-sm text-text-muted italic">No additional details provided</p>
                      )}
                      {canManageBounties && (
                        <div className="flex justify-end mt-4">
                          <Button
                            variant="primary"
                            size="sm"
                            icon={<CheckCircle2 size={16} />}
                            onClick={(event) => {
                              event.stopPropagation();
                              onClickComplete(bounty);
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
          {shouldShowToggle && (
            <div className="p-4 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsShowingAll(!isShowingAll)}
              >
                {isShowingAll ? 'Show Less' : `Show All (${filteredBounties.length})`}
              </Button>
            </div>
          )}
        </div>
      ) : bountyBoard.openBounties.length > 0 ? (
        <div className="px-6 py-12 text-center">
          <Search size={24} className="text-text-muted mx-auto mb-3" />
          <p className="text-sm text-text-muted">No bounties match "{searchTerm}"</p>
        </div>
      ) : (
        <div className="px-6 py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto mb-3">
            <Target size={24} className="text-text-muted" />
          </div>
          <p className="text-sm text-text-muted">No bounties posted yet</p>
          {canManageBounties && (
            <p className="text-xs text-text-dim mt-1">Create the first bounty to get started</p>
          )}
        </div>
      )}
    </section>
  );
}
