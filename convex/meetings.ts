import { query, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

export const getMeetings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const meetings = await ctx.db
      .query("meetings")
      .withIndex("by_date")
      .order("desc")
      .take(50);

    return meetings;
  },
});

export const getMeetingById = query({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.meetingId);
  },
});

const requireMeetingManager = async (ctx: MutationCtx) => {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const member = await ctx.db
    .query("members")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();

  if (!member) {
    throw new Error("Member not found");
  }

  if (member.role !== "admin" && member.role !== "lead") {
    throw new Error("Only admins and leads can manage meetings");
  }

  return { userId, member } as const;
};

export const createMeeting = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    date: v.number(),
    startTime: v.string(),
    endTime: v.string(),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireMeetingManager(ctx);

    const meetingId = await ctx.db.insert("meetings", {
      ...args,
      createdBy: userId,
      createdAt: Date.now(),
    });
    // Notify immediately about creation
    await ctx.scheduler.runAfter(
      0,
      internal.notifications.sendMeetingCreatedNotification,
      { meetingId }
    );
    // Schedule reminder 3 hours before the meeting start
    const meetingStart = args.date; // assuming date is ms since epoch for meeting day; combine with startTime if needed
    // Parse startTime "HH:MM" to hours/minutes
    const [hours, minutes] = args.startTime
      .split(":")
      .map((x) => parseInt(x, 10));
    const startDate = new Date(meetingStart);
    startDate.setHours(hours, minutes, 0, 0);
    const reminderTime = new Date(startDate.getTime() - 3 * 60 * 60 * 1000);
    const delayMs = Math.max(0, reminderTime.getTime() - Date.now());
    await ctx.scheduler.runAfter(
      delayMs,
      internal.notifications.sendMeetingReminderNotification,
      { meetingId }
    );
    return meetingId;
  },
});

export const updateMeeting = mutation({
  args: {
    meetingId: v.id("meetings"),
    title: v.string(),
    description: v.optional(v.string()),
    date: v.number(),
    startTime: v.string(),
    endTime: v.string(),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireMeetingManager(ctx);

    const { meetingId, ...updates } = args;
    await ctx.db.patch(meetingId, updates);
  },
});

export const deleteMeeting = mutation({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    await requireMeetingManager(ctx);

    await ctx.db.delete(args.meetingId);
  },
});

export const rsvpToMeeting = mutation({
  args: {
    meetingId: v.id("meetings"),
    status: v.union(v.literal("attending"), v.literal("not_attending")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!member) throw new Error("Member not found");

    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) throw new Error("Meeting not found");

    const existing = await ctx.db
      .query("meetingRsvps")
      .withIndex("by_meeting_and_member", (q) =>
        q.eq("meetingId", args.meetingId).eq("memberId", member._id)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("meetingRsvps", {
      meetingId: args.meetingId,
      memberId: member._id,
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const getMyRsvpForMeeting = query({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!member) return null;

    const existing = await ctx.db
      .query("meetingRsvps")
      .withIndex("by_meeting_and_member", (q) =>
        q.eq("meetingId", args.meetingId).eq("memberId", member._id)
      )
      .unique();

    return existing ? { status: existing.status } : null;
  },
});

export const getRsvpsForMeeting = query({
  args: {
    meetingId: v.id("meetings"),
  },
  returns: v.array(
    v.object({
      _id: v.id("meetingRsvps"),
      memberId: v.id("members"),
      status: v.union(v.literal("attending"), v.literal("not_attending")),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Check if user is authenticated and has access
    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!member) return [];

    // Get all RSVPs for this meeting
    const rsvps = await ctx.db
      .query("meetingRsvps")
      .withIndex("by_meeting", (q) => q.eq("meetingId", args.meetingId))
      .collect();

    return rsvps.map((rsvp) => ({
      _id: rsvp._id,
      memberId: rsvp.memberId,
      status: rsvp.status,
      updatedAt: rsvp.updatedAt,
    }));
  },
});

export const getRsvpedMeetingsForCurrentMember = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("meetings"),
      title: v.string(),
      description: v.optional(v.string()),
      date: v.number(),
      startTime: v.string(),
      endTime: v.string(),
      location: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!member) return [];

    const rsvps = await ctx.db
      .query("meetingRsvps")
      .withIndex("by_member", (q) => q.eq("memberId", member._id))
      .collect();

    const now = Date.now();
    const meetings: Array<{
      _id: any;
      title: string;
      description?: string;
      date: number;
      startTime: string;
      endTime: string;
      location?: string;
    }> = [];
    for (const r of rsvps) {
      const m = await ctx.db.get(r.meetingId);
      if (m && m.date < now) {
        meetings.push({
          _id: m._id,
          title: m.title,
          description: m.description,
          date: m.date,
          startTime: m.startTime,
          endTime: m.endTime,
          location: m.location,
        });
      }
    }
    meetings.sort((a, b) => b.date - a.date);
    return meetings;
  },
});
