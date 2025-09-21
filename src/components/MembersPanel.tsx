import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { MemberWithProfile } from "../lib/members";
import { ProfileAvatar } from "./ProfileAvatar";

interface MembersPanelProps {
  member: MemberWithProfile;
}

export function MembersPanel({ member }: MembersPanelProps) {
  const members =
    (useQuery(api.members.getAllMembers) as MemberWithProfile[] | undefined) ||
    [];
  const updateMemberRole = useMutation(api.members.updateMemberRole);

  const canManageRoles = member.role === "admin";

  const handleRoleChange = async (
    memberId: string,
    newRole: "admin" | "lead" | "member"
  ) => {
    try {
      await updateMemberRole({ memberId: memberId as any, newRole });
      toast.success("Member role updated successfully!");
    } catch (error) {
      toast.error("Failed to update member role");
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-500/20 text-red-300 border-red-500/30";
      case "lead":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
      default:
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    }
  };

  const formatJoinDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!canManageRoles && member.role !== "lead") {
    return (
      <div className="glass-panel p-8 text-center">
        <h3 className="text-xl font-semibold text-white mb-4">Team Members</h3>
        <p className="text-gray-400">
          You don't have permission to view the full member list.
        </p>
        <p className="text-sm text-gray-500 mt-2">
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
          <h3 className="text-xl font-semibold text-white">Team Members</h3>
          <p className="text-gray-400 text-sm mt-1">
            Manage roles and permissions for FRC Team 7157
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-orange-400">{members.length}</p>
          <p className="text-xs text-gray-400">Total Members</p>
        </div>
      </div>

      {/* Role Legend */}
      <div className="glass-panel p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3">
          Role Permissions
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center space-x-3">
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
              Admin
            </span>
            <span className="text-gray-400">Full access to all features</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
              Lead
            </span>
            <span className="text-gray-400">Manage meetings & purchases</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Member
            </span>
            <span className="text-gray-400">Submit purchase requests</span>
          </div>
        </div>
      </div>

      {/* Members List */}
      <div className="space-y-3">
        {members.length === 0 ? (
          <div className="glass-panel p-8 text-center">
            <p className="text-gray-400">No members found.</p>
          </div>
        ) : (
          members.map((teamMember) => (
            <div key={teamMember._id} className="glass-panel p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <ProfileAvatar
                    name={teamMember.name}
                    imageUrl={teamMember.profileImageUrl}
                    size="lg"
                    className="border-2 border-border-glass"
                  />

                  <div>
                    <h4 className="font-medium text-white">
                      {teamMember.name}
                    </h4>
                    <p className="text-sm text-gray-400">{teamMember.email}</p>
                    <p className="text-xs text-gray-500">
                      Joined {formatJoinDate(teamMember.joinedAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {canManageRoles ? (
                    <select
                      value={teamMember.role}
                      onChange={(e) =>
                        handleRoleChange(
                          teamMember._id,
                          e.target.value as "admin" | "lead" | "member"
                        )
                      }
                      className="bg-black/30 border border-white/20 rounded-lg px-3 py-1 text-sm text-white focus:border-orange-500 focus:outline-none"
                      disabled={teamMember._id === member._id} // Can't change own role
                    >
                      <option value="member">Member</option>
                      <option value="lead">Lead</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleColor(teamMember.role)}`}
                    >
                      {teamMember.role.charAt(0).toUpperCase() +
                        teamMember.role.slice(1)}
                    </span>
                  )}

                  {teamMember._id === member._id && (
                    <span className="text-xs text-orange-400 bg-orange-500/10 px-2 py-1 rounded-full">
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
        <div className="glass-panel p-4 border border-yellow-500/30">
          <div className="flex items-start space-x-3">
            <span className="text-yellow-400 mt-1">⚠️</span>
            <div>
              <h4 className="text-sm font-medium text-yellow-300 mb-1">
                Admin Note
              </h4>
              <p className="text-xs text-gray-400">
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
