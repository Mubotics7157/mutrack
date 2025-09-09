import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

interface MembersPageProps {
  member: Doc<"members">;
}

export function MembersPage({ member }: MembersPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");

  const members = useQuery(api.members.getAllMembers) || [];
  const updateMemberRole = useMutation(api.members.updateMemberRole);
  const deleteMember = useMutation(api.members.deleteMember);

  const canManageRoles = member.role === "admin";

  const handleRoleChange = async (
    memberId: string,
    newRole: "admin" | "lead" | "member"
  ) => {
    try {
      await updateMemberRole({ memberId: memberId as any, newRole });
      toast.success("member role updated successfully");
    } catch (error) {
      toast.error("failed to update member role");
    }
  };

  const formatJoinDate = (timestamp: number) => {
    return new Date(timestamp)
      .toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
      .toLowerCase();
  };

  // Filter members based on search and role
  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || m.role === filterRole;
    return matchesSearch && matchesRole;
  });

  // Group members by role for stats
  const roleStats = {
    admin: members.filter((m) => m.role === "admin").length,
    lead: members.filter((m) => m.role === "lead").length,
    member: members.filter((m) => m.role === "member").length,
  };

  // All members can view the list now

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="glass-panel p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
          <div>
            <h1 className="text-3xl font-light mb-2 text-gradient">
              team members
            </h1>
            <p className="text-text-muted">
              manage roles and permissions for frc team 7157
            </p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-3xl font-light text-sunset-orange">
                {members.length}
              </p>
              <p className="text-sm text-text-dim">total</p>
            </div>
          </div>
        </div>

        {/* Role Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card-modern text-center">
            <div className="text-2xl font-light text-error-red mb-1">
              {roleStats.admin}
            </div>
            <div className="text-sm text-text-muted">admins</div>
          </div>
          <div className="card-modern text-center">
            <div className="text-2xl font-light text-yellow-400 mb-1">
              {roleStats.lead}
            </div>
            <div className="text-sm text-text-muted">leads</div>
          </div>
          <div className="card-modern text-center">
            <div className="text-2xl font-light text-blue-400 mb-1">
              {roleStats.member}
            </div>
            <div className="text-sm text-text-muted">members</div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="glass-panel p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="search by name or email..."
            className="input-modern flex-1"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="input-modern md:w-48"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="all">all roles</option>
            <option value="admin">admins only</option>
            <option value="lead">leads only</option>
            <option value="member">members only</option>
          </select>
        </div>
      </div>

      {/* Role Permissions Info */}
      <div className="glass-panel p-6">
        <h4 className="text-sm font-mono text-text-secondary mb-4">
          role permissions
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-3">
            <span className="badge badge-rejected">admin</span>
            <span className="text-text-muted">full access to all features</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="badge badge-pending">lead</span>
            <span className="text-text-muted">manage meetings & purchases</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="badge badge-ordered">member</span>
            <span className="text-text-muted">submit purchase requests</span>
          </div>
        </div>
      </div>

      {/* Members List */}
      <div className="space-y-4">
        {filteredMembers.length === 0 ? (
          <div className="glass-panel p-8 text-center">
            <p className="text-text-muted">
              {searchTerm || filterRole !== "all"
                ? "no members found matching your criteria"
                : "no members found"}
            </p>
          </div>
        ) : (
          filteredMembers.map((teamMember) => (
            <div key={teamMember._id} className="card-modern">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="avatar">
                    {teamMember.name.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <h4 className="font-light text-lg text-text-primary flex items-center gap-2">
                      {teamMember.name}
                      {teamMember._id === member._id && (
                        <span className="text-xs text-sunset-orange bg-sunset-orange-dim px-2 py-0.5 rounded-full">
                          you
                        </span>
                      )}
                    </h4>
                    <p className="text-sm text-text-muted">
                      {teamMember.email}
                    </p>
                    <p className="text-xs text-text-dim mt-1">
                      joined {formatJoinDate(teamMember.joinedAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {canManageRoles && teamMember._id !== member._id ? (
                    <select
                      value={teamMember.role}
                      onChange={(e) =>
                        handleRoleChange(
                          teamMember._id,
                          e.target.value as "admin" | "lead" | "member"
                        )
                      }
                      className="input-modern py-2 px-4 text-sm"
                    >
                      <option value="member">member</option>
                      <option value="lead">lead</option>
                      <option value="admin">admin</option>
                    </select>
                  ) : (
                    <RoleBadge role={teamMember.role} />
                  )}
                  {canManageRoles && teamMember._id !== member._id && (
                    <button
                      className="btn-modern btn-danger p-2"
                      title="Remove member"
                      onClick={async () => {
                        if (!confirm(`Remove ${teamMember.name}?`)) return;
                        try {
                          await deleteMember({
                            memberId: teamMember._id as any,
                          });
                          toast.success("member removed");
                        } catch (e) {
                          toast.error("failed to remove member");
                        }
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Admin Warning */}
      {canManageRoles && (
        <div className="glass-panel p-6 border border-yellow-500/30">
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={20}
              className="text-yellow-400 flex-shrink-0 mt-0.5"
            />
            <div>
              <h4 className="text-sm font-mono text-yellow-400 mb-2">
                admin note
              </h4>
              <p className="text-sm text-text-muted">
                be careful when changing member roles. admins have full access
                to all system features. you cannot change your own role for
                security reasons.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const getBadgeClass = () => {
    switch (role) {
      case "admin":
        return "badge-rejected";
      case "lead":
        return "badge-pending";
      default:
        return "badge-ordered";
    }
  };

  return <span className={`badge ${getBadgeClass()}`}>{role}</span>;
}
