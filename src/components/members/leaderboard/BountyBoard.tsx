import React, { useState, useMemo, useEffect } from 'react';
import clsx from 'clsx';
import { ClipboardList, Search, Target, CheckCircle2, ChevronDown, Sparkles } from 'lucide-react';
import { BountyBoardData, BountyEntry } from '../types';
import { formatDateTime } from '../helpers';
import { type Id } from '../../../../convex/_generated/dataModel';

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
    <div className="space-y-4 mt-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList size={18} className="text-accent-purple" />
          <h4 className="text-sm font-mono uppercase tracking-widest text-text-secondary">open bounties</h4>
          <span className="text-xs text-text-dim">
            {bountyBoard.openBounties.length === 0
              ? 'none yet — post one to get things rolling.'
              : `${bountyBoard.openBounties.length} active`}
          </span>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          {(bountyBoard.openBounties.length > 0 || searchTerm.length > 0) && (
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
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
              className="btn-modern btn-secondary flex items-center gap-2 px-4 py-2 touch-feedback"
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
                  'relative overflow-hidden rounded-2xl border border-border-glass bg-glass transition-shadow',
                  isExpanded && 'ring-1 ring-accent-purple/40 shadow-[0_20px_45px_rgba(129,140,248,0.18)]'
                )}
              >
                <div className="absolute inset-0 opacity-60 pointer-events-none">
                  <div className="absolute -top-16 -left-12 h-36 w-36 rounded-full bg-gradient-to-br from-accent-purple/30 via-pink-500/25 to-transparent blur-3xl" />
                  <div className="absolute -bottom-16 -right-12 h-36 w-36 rounded-full bg-gradient-to-br from-sunset-orange/30 via-amber-300/25 to-transparent blur-3xl" />
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedBountyId((current) => (current === bounty._id ? null : bounty._id))}
                  className="relative z-10 w-full text-left p-4 flex flex-col gap-3 touch-feedback"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-base font-light text-text-primary">{bounty.title}</p>
                      <p className="text-xs text-text-dim mt-1">
                        posted by {bounty.createdBy.name} · {formatDateTime(bounty.createdAt)}
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
                        className={clsx('text-text-muted transition-transform', isExpanded && 'rotate-180')}
                      />
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-white/10 pt-3">
                      {bounty.description ? (
                        <p className="text-sm text-text-muted leading-relaxed">{bounty.description}</p>
                      ) : (
                        <p className="text-xs text-text-dim">no extra notes provided for this bounty.</p>
                      )}
                      {canManageBounties && (
                        <div className="flex justify-end mt-4">
                          <button
                            type="button"
                            className="btn-modern btn-primary flex items-center gap-2 px-4 py-2 touch-feedback"
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
                className="btn-modern px-5 py-2 text-xs font-mono uppercase tracking-widest text-text-secondary touch-feedback"
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
                className="btn-modern px-5 py-2 text-xs font-mono uppercase tracking-widest text-text-secondary touch-feedback"
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
          no bounties match "{searchTerm}".
        </div>
      )}
    </div>
  );
}
