import { AlertTriangle, Trash2 } from "lucide-react";
import { type Doc, type Id } from "../../../convex/_generated/dataModel";
import { formatDateYMD } from "./helpers";

export interface ManagementTabProps {
  members: Array<Doc<"members">>;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  formatJoinDate?: (ts: number) => string;
  currentMemberId: Id<"members">;
  onRoleChange: (
    memberId: Id<"members">,
    newRole: "admin" | "lead" | "member"
  ) => Promise<void>;
  onRemoveMember: (member: Doc<"members">) => Promise<void>;
}

export function ManagementTab(props: ManagementTabProps) {
  const {
    members,
    searchTerm,
    onSearchTermChange,
    roleFilter,
    onRoleFilterChange,
    formatJoinDate,
    currentMemberId,
    onRoleChange,
    onRemoveMember,
  } = props;
  const formatJoin = formatJoinDate ?? formatDateYMD;
  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 border border-yellow-500/30">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="search by name or email..."
            className="input-modern flex-1"
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
          />
          <select
            className="input-modern md:w-48"
            value={roleFilter}
            onChange={(e) => onRoleFilterChange(e.target.value)}
          >
            <option value="all">all roles</option>
            <option value="admin">admins only</option>
            <option value="lead">leads only</option>
            <option value="member">members only</option>
          </select>
        </div>
        <p className="text-xs text-text-muted mt-4">
          adjust roles, remove members, and keep access tidy. changes apply
          instantly.
        </p>
      </div>

      <div className="space-y-4">
        {members.length === 0 ? (
          <div className="glass-panel p-8 text-center">
            <p className="text-text-muted">
              no members match your filters right now.
            </p>
          </div>
        ) : (
          members.map((teamMember) => (
            <div
              key={teamMember._id}
              className="card-modern border border-white/10"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="avatar">
                    {teamMember.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-light text-lg text-text-primary flex items-center gap-2">
                      {teamMember.name}
                      {teamMember._id === currentMemberId && (
                        <span className="text-xs text-sunset-orange bg-sunset-orange-dim px-2 py-0.5 rounded-full">
                          you
                        </span>
                      )}
                    </h4>
                    <p className="text-sm text-text-muted">
                      {teamMember.email}
                    </p>
                    <p className="text-xs text-text-dim mt-1">
                      joined {formatJoin(teamMember.joinedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={teamMember.role}
                    onChange={(e) =>
                      onRoleChange(
                        teamMember._id,
                        e.target.value as "admin" | "lead" | "member"
                      )
                    }
                    className="input-modern py-2 px-4 text-sm"
                    disabled={teamMember._id === currentMemberId}
                  >
                    <option value="member">member</option>
                    <option value="lead">lead</option>
                    <option value="admin">admin</option>
                  </select>
                  {teamMember._id !== currentMemberId && (
                    <button
                      className="btn-modern btn-danger p-2"
                      title="Remove member"
                      onClick={() => {
                        void onRemoveMember(teamMember);
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
              be careful when changing member roles. admins have full access to
              all system features. you cannot change your own role for security
              reasons.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
