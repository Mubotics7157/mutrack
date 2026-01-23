import React from 'react';
import { ProfileAvatar } from '../ProfileAvatar';
import { MemberWithProfile } from '../../lib/members';
import { Badge } from '../ui';

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
        return 'admin';
      case 'lead':
        return 'lead';
      default:
        return 'member';
    }
  };

  return (
    <div className="glass-panel p-8">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
        <ProfileAvatar
          name={member.name}
          imageUrl={displayedProfileImageUrl}
          size="2xl"
          className="shadow-[0_0_25px_rgba(136,58,234,0.25)] border-2 border-border-glass"
        />

        <div className="flex-1">
          <h1 className="text-3xl font-light mb-2">{member.name}</h1>
          <p className="text-text-muted mb-3">{member.email}</p>
          <div className="flex flex-wrap items-center gap-4">
            <Badge variant={getRoleBadgeVariant()}>{member.role}</Badge>
            <span className="text-sm text-text-dim">member since {formatDate(member.joinedAt)}</span>
            <span className="text-sm text-text-dim">id: {member._id.slice(-8)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onEditToggle} className="btn-modern touch-feedback">
            {isEditing ? 'cancel' : 'edit profile'}
          </button>
          <button onClick={onSignOut} className="btn-modern btn-danger touch-feedback">
            sign out
          </button>
        </div>
      </div>
    </div>
  );
}
