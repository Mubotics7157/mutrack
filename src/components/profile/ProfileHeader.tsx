import { Pencil, LogOut, X } from 'lucide-react';
import { ProfileAvatar } from '../ProfileAvatar';
import { MemberWithProfile } from '../../lib/members';
import { Badge, Button } from '../ui';

interface ProfileHeaderProps {
  member: MemberWithProfile;
  displayedProfileImageUrl: string | null;
  onEditToggle: () => void;
  onSignOut: () => void;
  isEditing: boolean;
}

export function ProfileHeader({
  member,
  displayedProfileImageUrl,
  onEditToggle,
  onSignOut,
  isEditing,
}: ProfileHeaderProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp)
      .toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      .toLowerCase();
  };

  const getRoleBadgeVariant = () => {
    switch (member.role) {
      case 'admin':
        return 'error';
      case 'lead':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <section className="bg-bg-secondary border border-border rounded-xl p-6">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
        <ProfileAvatar
          name={member.name}
          imageUrl={displayedProfileImageUrl}
          size="2xl"
          className="ring-4 ring-accent/20"
        />

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-text-primary mb-1">{member.name}</h1>
          <p className="text-text-muted mb-3">{member.email}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={getRoleBadgeVariant()} size="sm">{member.role}</Badge>
            <span className="text-sm text-text-muted">Member since {formatDate(member.joinedAt)}</span>
            <span className="text-xs text-text-dim font-mono">#{member._id.slice(-8)}</span>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <Button
            variant={isEditing ? 'ghost' : 'secondary'}
            size="sm"
            icon={isEditing ? <X size={16} /> : <Pencil size={16} />}
            onClick={onEditToggle}
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={<LogOut size={16} />}
            onClick={onSignOut}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </section>
  );
}
