import React, { useState, type FormEvent } from 'react';
import { Modal } from '../../Modal';
import { Target } from 'lucide-react';
import { toast } from 'sonner';

interface CreateBountyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (input: { title: string; description: string | null; points: number }) => Promise<boolean>;
  isCreating: boolean;
}

export function CreateBountyModal({ isOpen, onClose, onCreate, isCreating }: CreateBountyModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState('5');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error('enter a bounty title');
      return;
    }
    const parsedPoints = Number(points);
    if (!Number.isFinite(parsedPoints) || parsedPoints <= 0) {
      toast.error('enter a positive μpoint value');
      return;
    }
    const trimmedDescription = description.trim();
    const wasCreated = await onCreate({
      title: trimmedTitle,
      description: trimmedDescription || null,
      points: parsedPoints,
    });
    if (wasCreated) {
      setTitle('');
      setDescription('');
      setPoints('5');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="post a bounty" maxWidthClassName="max-w-lg">
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-text-secondary mb-2 block">
              bounty title
            </label>
            <input
              type="text"
              className="input-modern"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
              value={points}
              onChange={(e) => setPoints(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-mono uppercase tracking-widest text-text-secondary mb-2 block">
            description
          </label>
          <textarea
            className="input-modern min-h-[100px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="share context, deliverables, or links..."
          />
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-modern touch-feedback" onClick={onClose}>
            cancel
          </button>
          <button
            type="submit"
            className="btn-modern btn-secondary flex items-center gap-2 px-5 py-2.5 touch-feedback"
            disabled={isCreating}
          >
            <Target size={18} />
            {isCreating ? 'posting...' : 'post bounty'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
