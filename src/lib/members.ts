import { Doc } from "../../convex/_generated/dataModel";

type NullableString = string | null | undefined;

export type MemberWithProfile = Doc<"members"> & {
  profileImageUrl?: NullableString;
};

export function getMemberInitials(name: string): string {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  const first = parts[0].charAt(0);
  const last = parts[parts.length - 1].charAt(0);
  return `${first}${last}`.toUpperCase();
}
