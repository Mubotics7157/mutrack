import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

const ACTIVE_TIMEOUT_MS = 5 * 60 * 1000; // consider inactive if not seen for 5 minutes

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
      await ctx.db.patch(active._id, { lastSeenAt: now });
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
      scannerMemberId: v.id("members"),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const now = Date.now();
    const sessions = await ctx.db
      .query("attendanceSessions")
      .withIndex("by_meeting_and_endTime", (q) =>
        q.eq("meetingId", args.meetingId).eq("endTime", null)
      )
      .collect();
    // Filter out sessions that are stale (optional; they will be closed by cleanup)
    return sessions.filter((s) => now - s.lastSeenAt <= ACTIVE_TIMEOUT_MS);
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
      scannerMemberId: v.id("members"),
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
