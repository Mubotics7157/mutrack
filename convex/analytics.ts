import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// Helper to get start of day in ms
function startOfDay(timestamp: number): number {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Helper to get start of week (Sunday) in ms
function startOfWeek(timestamp: number): number {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.getTime();
}

export const getTeamInsights = query({
  args: {},
  returns: v.object({
    // Team overview
    totalMembers: v.number(),
    activeMembers: v.number(), // attended in last 30 days
    totalAttendanceHours: v.number(),
    totalPointsAwarded: v.number(),

    // Meeting stats
    totalMeetings: v.number(),
    meetingsThisMonth: v.number(),
    averageAttendancePerMeeting: v.number(),

    // Engagement breakdown
    engagementTiers: v.object({
      highlyActive: v.number(), // 5+ meetings in last 30 days
      active: v.number(), // 2-4 meetings
      occasional: v.number(), // 1 meeting
      inactive: v.number(), // 0 meetings
    }),

    // Top contributors (combined score: hours + points)
    topContributors: v.array(
      v.object({
        memberId: v.id("members"),
        name: v.string(),
        profileImageUrl: v.union(v.string(), v.null()),
        totalHours: v.number(),
        totalPoints: v.number(),
        combinedScore: v.number(),
      })
    ),

    // Recent meetings with attendance
    recentMeetings: v.array(
      v.object({
        meetingId: v.id("meetings"),
        title: v.string(),
        date: v.number(),
        attendeeCount: v.number(),
        totalMembers: v.number(),
        attendanceRate: v.number(),
      })
    ),

    // Weekly activity (last 8 weeks)
    weeklyActivity: v.array(
      v.object({
        weekStart: v.number(),
        weekLabel: v.string(),
        meetingCount: v.number(),
        uniqueAttendees: v.number(),
        totalHours: v.number(),
        pointsAwarded: v.number(),
      })
    ),

    // Bounty stats
    bountyStats: v.object({
      totalOpen: v.number(),
      totalCompleted: v.number(),
      pointsAvailable: v.number(),
      pointsAwarded: v.number(),
    }),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        totalMembers: 0,
        activeMembers: 0,
        totalAttendanceHours: 0,
        totalPointsAwarded: 0,
        totalMeetings: 0,
        meetingsThisMonth: 0,
        averageAttendancePerMeeting: 0,
        engagementTiers: { highlyActive: 0, active: 0, occasional: 0, inactive: 0 },
        topContributors: [],
        recentMeetings: [],
        weeklyActivity: [],
        bountyStats: { totalOpen: 0, totalCompleted: 0, pointsAvailable: 0, pointsAwarded: 0 },
      };
    }

    // Check if user is admin/lead
    const currentMember = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!currentMember || (currentMember.role !== "admin" && currentMember.role !== "lead")) {
      return {
        totalMembers: 0,
        activeMembers: 0,
        totalAttendanceHours: 0,
        totalPointsAwarded: 0,
        totalMeetings: 0,
        meetingsThisMonth: 0,
        averageAttendancePerMeeting: 0,
        engagementTiers: { highlyActive: 0, active: 0, occasional: 0, inactive: 0 },
        topContributors: [],
        recentMeetings: [],
        weeklyActivity: [],
        bountyStats: { totalOpen: 0, totalCompleted: 0, pointsAvailable: 0, pointsAwarded: 0 },
      };
    }

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const startOfThisMonth = new Date(now);
    startOfThisMonth.setDate(1);
    startOfThisMonth.setHours(0, 0, 0, 0);
    const eightWeeksAgo = now - 8 * 7 * 24 * 60 * 60 * 1000;

    // Fetch all data
    const members = await ctx.db.query("members").collect();
    const meetings = await ctx.db.query("meetings").collect();
    const sessions = await ctx.db.query("attendanceSessions").collect();
    const muPoints = await ctx.db.query("muPoints").collect();
    const bounties = await ctx.db.query("bounties").collect();

    // Get profile images
    const memberImageUrls = new Map<Id<"members">, string | null>();
    for (const member of members) {
      if (member.profileImageId) {
        const url = await ctx.storage.getUrl(member.profileImageId);
        memberImageUrls.set(member._id, url);
      } else {
        memberImageUrls.set(member._id, null);
      }
    }

    // Team overview
    const totalMembers = members.length;

    // Calculate member attendance in last 30 days
    const memberMeetingsLast30Days = new Map<Id<"members">, Set<Id<"meetings">>>();
    for (const member of members) {
      memberMeetingsLast30Days.set(member._id, new Set());
    }

    for (const session of sessions) {
      const sessionTime = session.endTime ?? session.lastSeenAt;
      if (sessionTime >= thirtyDaysAgo) {
        const meetings = memberMeetingsLast30Days.get(session.memberId);
        if (meetings) {
          meetings.add(session.meetingId);
        }
      }
    }

    const activeMembers = Array.from(memberMeetingsLast30Days.values()).filter(
      (meetingSet) => meetingSet.size > 0
    ).length;

    // Total attendance hours (all time)
    let totalAttendanceMs = 0;
    for (const session of sessions) {
      const endTime = session.endTime ?? session.lastSeenAt;
      totalAttendanceMs += Math.max(0, endTime - session.startTime);
    }
    const totalAttendanceHours = Math.round((totalAttendanceMs / (1000 * 60 * 60)) * 10) / 10;

    // Total points awarded
    const totalPointsAwarded = muPoints.reduce((sum, p) => sum + p.points, 0);

    // Meeting stats
    const totalMeetings = meetings.length;
    const meetingsThisMonth = meetings.filter(
      (m) => m.date >= startOfThisMonth.getTime()
    ).length;

    // Average attendance per meeting
    const meetingAttendance = new Map<Id<"meetings">, Set<Id<"members">>>();
    for (const session of sessions) {
      if (!meetingAttendance.has(session.meetingId)) {
        meetingAttendance.set(session.meetingId, new Set());
      }
      meetingAttendance.get(session.meetingId)!.add(session.memberId);
    }

    const meetingsWithAttendance = Array.from(meetingAttendance.values());
    const averageAttendancePerMeeting = meetingsWithAttendance.length > 0
      ? Math.round((meetingsWithAttendance.reduce((sum, s) => sum + s.size, 0) / meetingsWithAttendance.length) * 10) / 10
      : 0;

    // Engagement tiers
    const engagementTiers = { highlyActive: 0, active: 0, occasional: 0, inactive: 0 };
    for (const meetingSet of memberMeetingsLast30Days.values()) {
      const count = meetingSet.size;
      if (count >= 5) {
        engagementTiers.highlyActive++;
      } else if (count >= 2) {
        engagementTiers.active++;
      } else if (count >= 1) {
        engagementTiers.occasional++;
      } else {
        engagementTiers.inactive++;
      }
    }

    // Top contributors (combined hours + points)
    const memberStats = new Map<
      Id<"members">,
      { hours: number; points: number; name: string }
    >();

    for (const member of members) {
      memberStats.set(member._id, { hours: 0, points: 0, name: member.name });
    }

    for (const session of sessions) {
      const endTime = session.endTime ?? session.lastSeenAt;
      const durationHours = Math.max(0, endTime - session.startTime) / (1000 * 60 * 60);
      const stats = memberStats.get(session.memberId);
      if (stats) {
        stats.hours += durationHours;
      }
    }

    for (const point of muPoints) {
      const stats = memberStats.get(point.memberId);
      if (stats) {
        stats.points += point.points;
      }
    }

    // Combined score: 1 hour = 1 point equivalent for ranking
    const topContributors = Array.from(memberStats.entries())
      .map(([memberId, stats]) => ({
        memberId,
        name: stats.name,
        profileImageUrl: memberImageUrls.get(memberId) ?? null,
        totalHours: Math.round(stats.hours * 10) / 10,
        totalPoints: stats.points,
        combinedScore: Math.round((stats.hours + stats.points) * 10) / 10,
      }))
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, 5);

    // Recent meetings with attendance (last 10 past meetings)
    const pastMeetings = meetings
      .filter((m) => m.date <= now)
      .sort((a, b) => b.date - a.date)
      .slice(0, 10);

    const recentMeetings = pastMeetings.map((meeting) => {
      const attendees = meetingAttendance.get(meeting._id)?.size ?? 0;
      return {
        meetingId: meeting._id,
        title: meeting.title,
        date: meeting.date,
        attendeeCount: attendees,
        totalMembers,
        attendanceRate: totalMembers > 0 ? Math.round((attendees / totalMembers) * 100) : 0,
      };
    });

    // Weekly activity (last 8 weeks)
    const weeklyActivity: Array<{
      weekStart: number;
      weekLabel: string;
      meetingCount: number;
      uniqueAttendees: number;
      totalHours: number;
      pointsAwarded: number;
    }> = [];

    for (let i = 7; i >= 0; i--) {
      const weekStart = startOfWeek(now - i * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;

      const weekMeetings = meetings.filter(
        (m) => m.date >= weekStart && m.date < weekEnd
      );

      const weekSessions = sessions.filter((s) => {
        const sessionTime = s.endTime ?? s.lastSeenAt;
        return sessionTime >= weekStart && sessionTime < weekEnd;
      });

      const uniqueAttendees = new Set(weekSessions.map((s) => s.memberId)).size;

      let weekHours = 0;
      for (const session of weekSessions) {
        const endTime = session.endTime ?? session.lastSeenAt;
        weekHours += Math.max(0, endTime - session.startTime) / (1000 * 60 * 60);
      }

      const weekPoints = muPoints
        .filter((p) => p.createdAt >= weekStart && p.createdAt < weekEnd)
        .reduce((sum, p) => sum + p.points, 0);

      const weekDate = new Date(weekStart);
      const weekLabel = `${weekDate.getMonth() + 1}/${weekDate.getDate()}`;

      weeklyActivity.push({
        weekStart,
        weekLabel,
        meetingCount: weekMeetings.length,
        uniqueAttendees,
        totalHours: Math.round(weekHours * 10) / 10,
        pointsAwarded: weekPoints,
      });
    }

    // Bounty stats
    const openBounties = bounties.filter((b) => b.status === "open");
    const completedBounties = bounties.filter((b) => b.status === "completed");
    const bountyStats = {
      totalOpen: openBounties.length,
      totalCompleted: completedBounties.length,
      pointsAvailable: openBounties.reduce((sum, b) => sum + b.points, 0),
      pointsAwarded: completedBounties.reduce((sum, b) => sum + b.points, 0),
    };

    return {
      totalMembers,
      activeMembers,
      totalAttendanceHours,
      totalPointsAwarded,
      totalMeetings,
      meetingsThisMonth,
      averageAttendancePerMeeting,
      engagementTiers,
      topContributors,
      recentMeetings,
      weeklyActivity,
      bountyStats,
    };
  },
});
