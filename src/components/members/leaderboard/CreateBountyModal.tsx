import { useState, type FormEvent } from 'react';
import { Modal } from '../../Modal';
import { Target } from 'lucide-react';
import { toast } from 'sonner';
import { Input, Textarea, Button } from '../../ui';

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
      toast.error('Enter a bounty title');
      return;
    }
    const parsedPoints = Number(points);
    if (!Number.isFinite(parsedPoints) || parsedPoints <= 0) {
      toast.error('Enter a positive μpoint value');
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
    <Modal isOpen={isOpen} onClose={onClose} title="Post a Bounty" maxWidthClassName="max-w-lg">
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <div>
            <label className="block mb-2 text-sm font-medium text-text-primary">
              Bounty Title
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Design new pit display"
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-text-primary">
              μpoints Reward
            </label>
            <Input
              type="number"
              min="0"
              step="0.5"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block mb-2 text-sm font-medium text-text-primary">
            Description
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Share context, deliverables, or links..."
            rows={4}
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={<Target size={16} />}
            disabled={isCreating}
          >
            {isCreating ? 'Posting...' : 'Post Bounty'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
