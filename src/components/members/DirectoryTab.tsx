import { type Id } from "../../../convex/_generated/dataModel";
import { formatDateYMD } from "./helpers";
import { MemberWithProfile } from "../../lib/members";
import { ProfileAvatar } from "../ProfileAvatar";
import { SearchInput, Select, Badge } from "../ui";

export interface DirectoryTabProps {
  filteredMembers: Array<MemberWithProfile>;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  currentMemberId: Id<"members">;
  roleStats: { admin: number; lead: number; member: number };
}

const roleOptions = [
  { value: "all", label: "All Roles" },
  { value: "admin", label: "Admins" },
  { value: "lead", label: "Leads" },
  { value: "member", label: "Members" },
];

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
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="bg-bg-secondary border border-border rounded-xl p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <SearchInput
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            onClear={() => onSearchTermChange("")}
            className="flex-1"
          />
          <Select
            value={roleFilter}
            onChange={(e) => onRoleFilterChange(e.target.value)}
            options={roleOptions}
            className="md:w-40"
          />
        </div>
      </div>

      {/* Role Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-bg-secondary border border-border rounded-xl p-3 text-center">
          <div className="text-xl font-semibold text-accent-error">
            {roleStats.admin}
          </div>
          <div className="text-xs text-text-muted">Admins</div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-3 text-center">
          <div className="text-xl font-semibold text-accent-warning">
            {roleStats.lead}
          </div>
          <div className="text-xs text-text-muted">Leads</div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-3 text-center">
          <div className="text-xl font-semibold text-accent">
            {roleStats.member}
          </div>
          <div className="text-xs text-text-muted">Members</div>
        </div>
      </div>

      {/* Member List */}
      <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
        {filteredMembers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-text-muted">
              {searchTerm || roleFilter !== "all"
                ? "No members found matching your criteria"
                : "No members found"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {filteredMembers.map((teamMember) => (
              <div
                key={teamMember._id}
                className="flex items-center gap-4 p-4 hover:bg-bg-hover transition-colors"
              >
                <ProfileAvatar
                  name={teamMember.name}
                  imageUrl={teamMember.profileImageUrl}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-text-primary truncate">
                      {teamMember.name}
                    </h4>
                    {teamMember._id === currentMemberId && (
                      <Badge variant="accent" size="sm">You</Badge>
                    )}
                  </div>
                  <p className="text-sm text-text-muted truncate">
                    {teamMember.email}
                  </p>
                  <p className="text-xs text-text-dim mt-0.5">
                    Joined {formatDateYMD(teamMember.joinedAt)}
                  </p>
                </div>
                <Badge
                  variant={
                    teamMember.role === "admin"
                      ? "error"
                      : teamMember.role === "lead"
                      ? "warning"
                      : "default"
                  }
                  size="sm"
                >
                  {teamMember.role}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
