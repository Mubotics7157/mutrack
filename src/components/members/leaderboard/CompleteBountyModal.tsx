import React, { useState, useMemo, type FormEvent } from 'react';
import { Modal } from '../../Modal';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { BountyEntry } from '../types';
import { MemberWithProfile } from '../../../lib/members';
import { type Id } from '../../../../convex/_generated/dataModel';

interface CompleteBountyModalProps {
  bounty: BountyEntry | null;
  members: MemberWithProfile[];
  onClose: () => void;
  onComplete: (input: { bountyId: Id<'bounties'>; memberId: Id<'members'>; notes: string | null }) => Promise<boolean>;
  completingBountyId: Id<'bounties'> | null;
  formatPoints: (value: number) => string;
}

export function CompleteBountyModal({
  bounty,
  members,
  onClose,
  onComplete,
  completingBountyId,
  formatPoints,
}: CompleteBountyModalProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<Id<'members'> | null>(null);
  const [notes, setNotes] = useState('');

  const sortedMembers = useMemo(() => [...members].sort((a, b) => a.name.localeCompare(b.name)), [members]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!bounty) return;
    if (!selectedMemberId) {
      toast.error('select a member to reward');
      return;
    }
    const trimmedNotes = notes.trim();
    const wasCompleted = await onComplete({
      bountyId: bounty._id,
      memberId: selectedMemberId,
      notes: trimmedNotes || null,
    });
    if (wasCompleted) {
      setSelectedMemberId(null);
      setNotes('');
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedMemberId(null);
    setNotes('');
    onClose();
  };

  return (
    <Modal
      isOpen={bounty !== null}
      onClose={handleClose}
      title={bounty ? `complete "${bounty.title}"` : 'complete bounty'}
      maxWidthClassName="max-w-lg"
    >
      {bounty && (
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-text-secondary mb-2 block">
              credit μpoints to
            </label>
            <select
              className="input-modern"
              value={selectedMemberId ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedMemberId(value ? (value as Id<'members'>) : null);
              }}
            >
              <option value="" disabled>
                select a member
              </option>
              {sortedMembers.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.name}
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
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="celebrate what made this bounty complete"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-modern touch-feedback" onClick={handleClose}>
              cancel
            </button>
            <button
              type="submit"
              className="btn-modern btn-primary flex items-center gap-2 px-5 py-2.5 touch-feedback"
              disabled={completingBountyId === bounty._id}
            >
              <CheckCircle2 size={18} />
              {completingBountyId === bounty._id ? 'completing...' : `award ${formatPoints(bounty.points)} μpoints`}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
