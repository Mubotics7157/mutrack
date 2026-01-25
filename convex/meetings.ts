import { query, mutation, internalQuery } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { computeMeetingStartUtcMs } from "./lib/meetingTime";

function computeMeetingEndUtcMs(dateMs: number, endTime: string): number {
  const [hoursPart, minutesPart] = endTime.split(":");
  const hours = Number.parseInt(hoursPart ?? "", 10);
  const minutes = Number.parseInt(minutesPart ?? "", 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    throw new Error(`Invalid endTime format: ${endTime}`);
  }

  const date = new Date(dateMs);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  // Use same timezone offset logic as computeMeetingStartUtcMs
  const timezoneOffsetMs = dateMs - Date.UTC(year, month, day);
  return Date.UTC(year, month, day, hours, minutes) + timezoneOffsetMs;
}

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
    const meetingStartUtcMs = computeMeetingStartUtcMs(
      args.date,
      args.startTime
    );
    const reminderTimeMs = meetingStartUtcMs - 3 * 60 * 60 * 1000;
    const delayMs = Math.max(0, reminderTimeMs - Date.now());
    await ctx.scheduler.runAfter(
      delayMs,
      internal.notifications.sendMeetingReminderNotification,
      { meetingId }
    );
    // Schedule SMS check-in for members without beacons
    await ctx.scheduler.runAfter(
      0,
      internal.smsCheckIn.scheduleSmsForMeeting,
      { meetingId }
    );
    return meetingId;
  },
});

export const createScheduledMeetings = mutation({
  args: {
    title: v.string(),
    location: v.optional(v.string()),
    startWeekDate: v.number(),
    weeks: v.number(),
    slots: v.array(
      v.object({
        dayIndex: v.number(), // 0 = Sunday, 1 = Monday, etc.
        startTime: v.string(),
        endTime: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireMeetingManager(ctx);

    const { title, location, startWeekDate, weeks, slots } = args;

    // Get the Sunday of the starting week
    const startDate = new Date(startWeekDate);
    const startSunday = new Date(startDate);
    startSunday.setDate(startDate.getDate() - startDate.getDay());

    const meetingIds = [];

    // For each week
    for (let week = 0; week < weeks; week++) {
      // For each slot in the weekly schedule
      for (const slot of slots) {
        // Calculate the date for this slot
        const meetingDate = new Date(startSunday);
        meetingDate.setDate(startSunday.getDate() + week * 7 + slot.dayIndex);

        // Skip if meeting date is before startWeekDate
        if (meetingDate.getTime() < startWeekDate) continue;

        const meetingId = await ctx.db.insert("meetings", {
          title,
          date: meetingDate.getTime(),
          startTime: slot.startTime,
          endTime: slot.endTime,
          location,
          createdBy: userId,
          createdAt: Date.now(),
        });
        meetingIds.push(meetingId);

        // Schedule reminder
        const meetingStartUtcMs = computeMeetingStartUtcMs(
          meetingDate.getTime(),
          slot.startTime
        );
        const reminderTimeMs = meetingStartUtcMs - 3 * 60 * 60 * 1000;
        const delayMs = Math.max(0, reminderTimeMs - Date.now());
        await ctx.scheduler.runAfter(
          delayMs,
          internal.notifications.sendMeetingReminderNotification,
          { meetingId }
        );
        // Schedule SMS check-in for members without beacons
        await ctx.scheduler.runAfter(
          0,
          internal.smsCheckIn.scheduleSmsForMeeting,
          { meetingId }
        );
      }
    }

    // Send one notification for the series
    if (meetingIds.length > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.sendMeetingCreatedNotification,
        { meetingId: meetingIds[0] }
      );
    }

    return meetingIds.length;
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

// Internal query for scanner API to find active meetings
export const getActiveMeetings = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const BUFFER_MS = 30 * 60 * 1000; // 30 minute buffer before/after meeting

    // Get meetings from recent days (to catch any ongoing)
    const recentMeetings = await ctx.db
      .query("meetings")
      .withIndex("by_date")
      .order("desc")
      .take(100);

    const activeMeetings = [];

    for (const meeting of recentMeetings) {
      try {
        const meetingStart = computeMeetingStartUtcMs(
          meeting.date,
          meeting.startTime
        );
        const meetingEnd = computeMeetingEndUtcMs(meeting.date, meeting.endTime);

        // Check if meeting is currently active (with buffer)
        if (now >= meetingStart - BUFFER_MS && now <= meetingEnd + BUFFER_MS) {
          activeMeetings.push({
            _id: meeting._id,
            title: meeting.title,
            date: meeting.date,
            startTime: meeting.startTime,
            endTime: meeting.endTime,
          });
        }
      } catch {
        // Skip meetings with invalid time formats
        continue;
      }
    }

    return activeMeetings;
  },
});
