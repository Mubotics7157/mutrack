import { useState, useMemo, type FormEvent } from 'react';
import { Modal } from '../../Modal';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { BountyEntry } from '../types';
import { MemberWithProfile } from '../../../lib/members';
import { type Id } from '../../../../convex/_generated/dataModel';
import { Select, Textarea, Button } from '../../ui';

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

  const memberOptions = [
    { value: '', label: 'Select a member' },
    ...sortedMembers.map((member) => ({ value: member._id, label: member.name })),
  ];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!bounty) return;
    if (!selectedMemberId) {
      toast.error('Select a member to reward');
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
      title={bounty ? `Complete "${bounty.title}"` : 'Complete Bounty'}
      maxWidthClassName="max-w-lg"
    >
      {bounty && (
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-text-primary">
              Credit μpoints To
            </label>
            <Select
              value={selectedMemberId ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedMemberId(value ? (value as Id<'members'>) : null);
              }}
              options={memberOptions}
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-text-primary">
              Completion Notes
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Celebrate what made this bounty complete..."
              rows={4}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={<CheckCircle2 size={16} />}
              disabled={completingBountyId === bounty._id}
            >
              {completingBountyId === bounty._id ? 'Completing...' : `Award ${formatPoints(bounty.points)} μpoints`}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
