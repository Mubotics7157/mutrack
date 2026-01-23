import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';
import { AlertTriangle, Users } from 'lucide-react';
import { MemberWithProfile } from '../lib/members';
import { ProfileAvatar } from './ProfileAvatar';
import { Badge, Select } from './ui';
import { cn } from '../lib/utils';

interface MembersPanelProps {
  member: MemberWithProfile;
}

export function MembersPanel({ member }: MembersPanelProps) {
  const members =
    (useQuery(api.members.getAllMembers) as MemberWithProfile[] | undefined) ||
    [];
  const updateMemberRole = useMutation(api.members.updateMemberRole);

  const canManageRoles = member.role === 'admin';

  const handleRoleChange = async (
    memberId: string,
    newRole: 'admin' | 'lead' | 'member'
  ) => {
    try {
      await updateMemberRole({ memberId: memberId as any, newRole });
      toast.success('Member role updated successfully!');
    } catch (error) {
      toast.error('Failed to update member role');
    }
  };

  const getRoleVariant = (role: string): 'default' | 'success' | 'warning' | 'error' => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'lead':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatJoinDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!canManageRoles && member.role !== 'lead') {
    return (
      <div className="bg-bg-secondary border border-border rounded-xl p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto mb-4">
          <Users size={24} className="text-text-muted" />
        </div>
        <h3 className="text-xl font-semibold text-text-primary mb-2">Team Members</h3>
        <p className="text-text-muted">
          You don't have permission to view the full member list.
        </p>
        <p className="text-sm text-text-dim mt-2">
          Contact an admin or lead for access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-text-primary">Team Members</h3>
          <p className="text-text-muted text-sm mt-1">
            Manage roles and permissions for FRC Team 7157
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-accent-orange">{members.length}</p>
          <p className="text-xs text-text-muted">Total Members</p>
        </div>
      </div>

      {/* Role Legend */}
      <div className="bg-bg-secondary border border-border rounded-xl p-4">
        <h4 className="text-sm font-medium text-text-primary mb-3">
          Role Permissions
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-3">
            <Badge variant="error">Admin</Badge>
            <span className="text-text-muted">Full access to all features</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="warning">Lead</Badge>
            <span className="text-text-muted">Manage meetings & purchases</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="default">Member</Badge>
            <span className="text-text-muted">Submit purchase requests</span>
          </div>
        </div>
      </div>

      {/* Members List */}
      <div className="space-y-3">
        {members.length === 0 ? (
          <div className="bg-bg-secondary border border-border rounded-xl p-8 text-center">
            <p className="text-text-muted">No members found.</p>
          </div>
        ) : (
          members.map((teamMember) => (
            <div key={teamMember._id} className="bg-bg-secondary border border-border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <ProfileAvatar
                    name={teamMember.name}
                    imageUrl={teamMember.profileImageUrl}
                    size="lg"
                    className="border-2 border-border"
                  />

                  <div>
                    <h4 className="font-medium text-text-primary">
                      {teamMember.name}
                    </h4>
                    <p className="text-sm text-text-muted">{teamMember.email}</p>
                    <p className="text-xs text-text-dim">
                      Joined {formatJoinDate(teamMember.joinedAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {canManageRoles ? (
                    <Select
                      value={teamMember.role}
                      onChange={(e) =>
                        handleRoleChange(
                          teamMember._id,
                          e.target.value as 'admin' | 'lead' | 'member'
                        )
                      }
                      options={[
                        { value: 'member', label: 'Member' },
                        { value: 'lead', label: 'Lead' },
                        { value: 'admin', label: 'Admin' },
                      ]}
                      disabled={teamMember._id === member._id}
                      className="w-28"
                    />
                  ) : (
                    <Badge variant={getRoleVariant(teamMember.role)}>
                      {teamMember.role.charAt(0).toUpperCase() + teamMember.role.slice(1)}
                    </Badge>
                  )}

                  {teamMember._id === member._id && (
                    <span className="text-xs text-accent-orange bg-accent-orange/10 px-2 py-1 rounded-full">
                      You
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {canManageRoles && (
        <div className="bg-accent-warning/10 border border-accent-warning/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-accent-warning mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-accent-warning mb-1">
                Admin Note
              </h4>
              <p className="text-xs text-text-muted">
                Be careful when changing member roles. Admins have full access
                to all system features. You cannot change your own role for
                security reasons.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
