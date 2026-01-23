import { AlertTriangle, Trash2 } from "lucide-react";
import { type Id } from "../../../convex/_generated/dataModel";
import { formatDateYMD } from "./helpers";
import { MemberWithProfile } from "../../lib/members";
import { ProfileAvatar } from "../ProfileAvatar";
import { SearchInput, Select, Button, Badge } from "../ui";

export interface ManagementTabProps {
  members: Array<MemberWithProfile>;
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
  onRemoveMember: (member: MemberWithProfile) => Promise<void>;
}

const filterOptions = [
  { value: "all", label: "All Roles" },
  { value: "admin", label: "Admins" },
  { value: "lead", label: "Leads" },
  { value: "member", label: "Members" },
];

const roleOptions = [
  { value: "member", label: "Member" },
  { value: "lead", label: "Lead" },
  { value: "admin", label: "Admin" },
];

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
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="bg-bg-secondary border border-accent-warning/30 rounded-xl p-4">
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
            options={filterOptions}
            className="md:w-40"
          />
        </div>
        <p className="text-xs text-text-muted mt-3">
          Adjust roles, remove members, and manage access. Changes apply instantly.
        </p>
      </div>

      {/* Member List */}
      <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
        {members.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-text-muted">
              No members match your filters.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {members.map((teamMember) => (
              <div
                key={teamMember._id}
                className="flex flex-col md:flex-row md:items-center gap-4 p-4"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
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
                      Joined {formatJoin(teamMember.joinedAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <Select
                    value={teamMember.role}
                    onChange={(e) =>
                      onRoleChange(
                        teamMember._id,
                        e.target.value as "admin" | "lead" | "member"
                      )
                    }
                    options={roleOptions}
                    disabled={teamMember._id === currentMemberId}
                    className="w-28"
                  />
                  {teamMember._id !== currentMemberId && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        void onRemoveMember(teamMember);
                      }}
                      icon={<Trash2 size={16} />}
                    >
                      <span className="sr-only">Remove</span>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin Warning */}
      <div className="bg-bg-secondary border border-accent-warning/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle
            size={18}
            className="text-accent-warning shrink-0 mt-0.5"
          />
          <div>
            <h4 className="text-sm font-medium text-accent-warning mb-1">
              Admin Note
            </h4>
            <p className="text-sm text-text-muted">
              Be careful when changing member roles. Admins have full access to
              all system features. You cannot change your own role for security
              reasons.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
