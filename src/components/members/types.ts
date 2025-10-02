import { type Id } from "../../../convex/_generated/dataModel";

export type LeaderboardRange = "allTime" | "lastMonth" | "lastWeek";

export type LeaderboardEntry = {
  memberId: Id<"members">;
  name: string;
  email: string;
  role: "admin" | "lead" | "member";
  totalPoints: number;
  awardsCount: number;
  lastAwardedAt: number | null;
  profileImageUrl: string | null;
  totalAttendanceMs: number;
  attendanceSessionCount: number;
  attendanceMeetingsCount: number;
  lastAttendanceAt: number | null;
};

export type BountyEntry = {
  _id: Id<"bounties">;
  title: string;
  description: string | null;
  points: number;
  status: "open" | "completed" | "cancelled";
  createdAt: number;
  createdBy: { memberId: Id<"members">; name: string };
  completedAt: number | null;
  completedBy: { memberId: Id<"members">; name: string } | null;
  completionNotes: string | null;
};

export type BountyBoardData = {
  openBounties: Array<BountyEntry>;
  recentlyCompleted: Array<BountyEntry>;
};
