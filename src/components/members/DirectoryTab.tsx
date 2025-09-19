import { type Doc, type Id } from "../../../convex/_generated/dataModel";
import { filterMembers, formatDateYMD } from "./helpers";
import { RoleBadge } from "./RoleBadge";

export interface DirectoryTabProps {
  filteredMembers: Array<Doc<"members">>;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  currentMemberId: Id<"members">;
  roleStats: { admin: number; lead: number; member: number };
}

export function DirectoryTab(props: DirectoryTabProps) {
  const {
    filteredMembers,
    searchTerm,
    onSearchTermChange,
    roleFilter,
    onRoleFilterChange,
    currentMemberId,
    roleStats,
  } = props;
  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      <div className="space-y-4">
        {filteredMembers.length === 0 ? (
          <div className="glass-panel p-8 text-center">
            <p className="text-text-muted">
              {searchTerm || roleFilter !== "all"
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
                      joined {formatDateYMD(teamMember.joinedAt)}
                    </p>
                  </div>
                </div>
                <RoleBadge role={teamMember.role} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
