import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { computeMeetingTimezoneOffsetMs } from "./lib/meetingTime";

const ACTIVE_TIMEOUT_MS = 5 * 60 * 1000; // consider inactive if not seen for 5 minutes

function computeMeetingEndUtcMs(dateMs: number, endTime: string): number {
  const [hoursPart, minutesPart] = endTime.split(":");
  const hours = Number.parseInt(hoursPart ?? "", 10);
  const minutes = Number.parseInt(minutesPart ?? "", 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return Infinity; // Invalid format, don't auto-close
  }
  const date = new Date(dateMs);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const timezoneOffsetMs = computeMeetingTimezoneOffsetMs(dateMs);
  return Date.UTC(year, month, day, hours, minutes) + timezoneOffsetMs;
}
const MIN_UPDATE_MS = 60 * 1000; // throttle session updates to at most once every minute

export const handleIbeaconSighting = mutation({
  args: {
    meetingId: v.id("meetings"),
    uuid: v.string(),
    major: v.number(),
    minor: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const scanner = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!scanner) throw new Error("Member not found");

    const key: string = await ctx.runQuery(
      internal.beacons.buildKeyForIbeacon,
      {
        uuid: args.uuid,
        major: args.major,
        minor: args.minor,
      }
    );

    const memberId = await ctx.runQuery(
      internal.beacons.findMemberByBeaconKey,
      {
        key,
      }
    );
    if (!memberId) {
      return null; // unknown beacon, ignore
    }

    // Find existing active session for this meeting/member
    const existing = await ctx.db
      .query("attendanceSessions")
      .withIndex("by_meeting_and_member", (q) =>
        q.eq("meetingId", args.meetingId).eq("memberId", memberId)
      )
      .collect();

    const now = Date.now();
    const active = existing.find((s) => s.endTime === null);
    if (active) {
      if (now - active.lastSeenAt >= MIN_UPDATE_MS) {
        await ctx.db.patch(active._id, { lastSeenAt: now });
      }
      return null;
    }

    // No active session; create a new one
    await ctx.db.insert("attendanceSessions", {
      meetingId: args.meetingId,
      memberId,
      startTime: now,
      lastSeenAt: now,
      endTime: null,
      scannerMemberId: scanner._id,
    });
    return null;
  },
});

export const getActiveSessionsForMeeting = query({
  args: { meetingId: v.id("meetings") },
  returns: v.array(
    v.object({
      _creationTime: v.number(),
      _id: v.id("attendanceSessions"),
      meetingId: v.id("meetings"),
      memberId: v.id("members"),
      startTime: v.number(),
      lastSeenAt: v.number(),
      endTime: v.union(v.null(), v.number()),
      scannerMemberId: v.optional(v.id("members")),
      scannerDeviceId: v.optional(v.id("scanners")),
      isManual: v.optional(v.boolean()),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const sessions = await ctx.db
      .query("attendanceSessions")
      .withIndex("by_meeting_and_endTime", (q) =>
        q.eq("meetingId", args.meetingId).eq("endTime", null)
      )
      .collect();
    // Return all open sessions regardless of last seen; durations use lastSeenAt/endTime
    return sessions;
  },
});

export const getMyActiveSession = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      session: v.object({
        _id: v.id("attendanceSessions"),
        meetingId: v.id("meetings"),
        memberId: v.id("members"),
        startTime: v.number(),
        lastSeenAt: v.number(),
        endTime: v.union(v.null(), v.number()),
        isManual: v.optional(v.boolean()),
      }),
      meeting: v.object({
        _id: v.id("meetings"),
        title: v.string(),
        date: v.number(),
        startTime: v.string(),
        endTime: v.string(),
      }),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!member) return null;

    // Find any active session for this member (endTime === null)
    // Only consider sessions where the meeting hasn't ended yet
    const sessions = await ctx.db
      .query("attendanceSessions")
      .withIndex("by_member", (q) => q.eq("memberId", member._id))
      .collect();

    const now = Date.now();
    const openSessions = sessions.filter((s) => s.endTime === null);

    // Find an active session whose meeting hasn't ended yet
    for (const session of openSessions) {
      const meeting = await ctx.db.get(session.meetingId);
      if (!meeting) continue;

      const meetingEndMs = computeMeetingEndUtcMs(meeting.date, meeting.endTime);
      // Session is active if meeting hasn't ended
      if (now < meetingEndMs) {
        return {
          session: {
            _id: session._id,
            meetingId: session.meetingId,
            memberId: session.memberId,
            startTime: session.startTime,
            lastSeenAt: session.lastSeenAt,
            endTime: session.endTime,
            isManual: session.isManual,
          },
          meeting: {
            _id: meeting._id,
            title: meeting.title,
            date: meeting.date,
            startTime: meeting.startTime,
            endTime: meeting.endTime,
          },
        };
      }
    }

    return null;
  },
});

export const getSessionsForMeeting = query({
  args: { meetingId: v.id("meetings") },
  returns: v.array(
    v.object({
      _creationTime: v.number(),
      _id: v.id("attendanceSessions"),
      meetingId: v.id("meetings"),
      memberId: v.id("members"),
      startTime: v.number(),
      lastSeenAt: v.number(),
      endTime: v.union(v.null(), v.number()),
      scannerMemberId: v.optional(v.id("members")),
      scannerDeviceId: v.optional(v.id("scanners")),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const sessions = await ctx.db
      .query("attendanceSessions")
      .withIndex("by_meeting", (q) => q.eq("meetingId", args.meetingId))
      .collect();
    return sessions;
  },
});

// Simple duration model: For each member in a meeting, take earliest start and latest end
// (where latest end is endTime if closed, otherwise lastSeenAt), and compute durationMs.
export const getMeetingDurationsSimple = query({
  args: { meetingId: v.id("meetings") },
  returns: v.array(
    v.object({
      memberId: v.id("members"),
      earliestStart: v.number(),
      latestEnd: v.number(),
      durationMs: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const sessions = await ctx.db
      .query("attendanceSessions")
      .withIndex("by_meeting", (q) => q.eq("meetingId", args.meetingId))
      .collect();

    const byMember = new Map<
      string,
      { earliestStart: number; latestEnd: number }
    >();
    for (const s of sessions) {
      const latest = s.endTime ?? s.lastSeenAt;
      const current = byMember.get(s.memberId);
      if (!current) {
        byMember.set(s.memberId, {
          earliestStart: s.startTime,
          latestEnd: latest,
        });
      } else {
        if (s.startTime < current.earliestStart)
          current.earliestStart = s.startTime;
        if (latest > current.latestEnd) current.latestEnd = latest;
      }
    }

    const result: Array<{
      memberId: any;
      earliestStart: number;
      latestEnd: number;
      durationMs: number;
    }> = [];
    for (const [memberId, span] of byMember.entries()) {
      const duration = Math.max(0, span.latestEnd - span.earliestStart);
      result.push({
        memberId: memberId as any,
        earliestStart: span.earliestStart,
        latestEnd: span.latestEnd,
        durationMs: duration,
      });
    }
    return result;
  },
});

export const closeExpiredSessions = mutation({
  args: { meetingId: v.id("meetings") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const now = Date.now();
    const sessions = await ctx.db
      .query("attendanceSessions")
      .withIndex("by_meeting_and_endTime", (q) =>
        q.eq("meetingId", args.meetingId).eq("endTime", null)
      )
      .collect();
    let closed = 0;
    for (const s of sessions) {
      if (now - s.lastSeenAt > ACTIVE_TIMEOUT_MS) {
        await ctx.db.patch(s._id, { endTime: s.lastSeenAt });
        closed++;
      }
    }
    return closed;
  },
});

export const manualSignIn = mutation({
  args: {
    meetingId: v.id("meetings"),
    memberId: v.id("members"),
  },
  returns: v.id("attendanceSessions"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Validate caller is admin
    const caller = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!caller) throw new Error("Member not found");
    if (caller.role !== "admin") throw new Error("Only admins can manually sign in members");

    // Check no active session exists for this member/meeting
    const existing = await ctx.db
      .query("attendanceSessions")
      .withIndex("by_meeting_and_member", (q) =>
        q.eq("meetingId", args.meetingId).eq("memberId", args.memberId)
      )
      .collect();
    const active = existing.find((s) => s.endTime === null);
    if (active) {
      throw new Error("Member already has an active session for this meeting");
    }

    const now = Date.now();
    const sessionId = await ctx.db.insert("attendanceSessions", {
      meetingId: args.meetingId,
      memberId: args.memberId,
      startTime: now,
      lastSeenAt: now,
      endTime: null,
      scannerMemberId: caller._id,
      isManual: true,
    });
    return sessionId;
  },
});

export const manualSignOut = mutation({
  args: {
    sessionId: v.id("attendanceSessions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Validate caller is admin
    const caller = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!caller) throw new Error("Member not found");
    if (caller.role !== "admin") throw new Error("Only admins can manually sign out members");

    // Validate session exists and is manual
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    if (session.isManual !== true) throw new Error("Can only sign out manual sessions");
    if (session.endTime !== null) throw new Error("Session already ended");

    await ctx.db.patch(args.sessionId, { endTime: Date.now() });
    return null;
  },
});

// Internal mutation for scanner device beacon sightings (no user auth required)
export const handleDeviceBeaconSighting = internalMutation({
  args: {
    meetingId: v.id("meetings"),
    uuid: v.string(),
    major: v.number(),
    minor: v.number(),
    scannerId: v.id("scanners"),
  },
  handler: async (ctx, args) => {
    const key: string = await ctx.runQuery(
      internal.beacons.buildKeyForIbeacon,
      {
        uuid: args.uuid,
        major: args.major,
        minor: args.minor,
      }
    );

    const memberId = await ctx.runQuery(
      internal.beacons.findMemberByBeaconKey,
      { key }
    );
    if (!memberId) {
      return null; // unknown beacon, ignore silently
    }

    // Find existing active session for this meeting/member
    const existing = await ctx.db
      .query("attendanceSessions")
      .withIndex("by_meeting_and_member", (q) =>
        q.eq("meetingId", args.meetingId).eq("memberId", memberId)
      )
      .collect();

    const now = Date.now();
    const active = existing.find((s) => s.endTime === null);
    if (active) {
      // Throttle updates to once per minute
      if (now - active.lastSeenAt >= MIN_UPDATE_MS) {
        await ctx.db.patch(active._id, { lastSeenAt: now });
      }
      return null;
    }

    // No active session; create a new one
    await ctx.db.insert("attendanceSessions", {
      meetingId: args.meetingId,
      memberId,
      startTime: now,
      lastSeenAt: now,
      endTime: null,
      scannerDeviceId: args.scannerId,
    });
    return null;
  },
});
