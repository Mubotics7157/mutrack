import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

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
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!member || (member.role !== "admin" && member.role !== "lead")) {
      throw new Error("Only admins and leads can create meetings");
    }

    return await ctx.db.insert("meetings", {
      ...args,
      createdBy: userId,
      createdAt: Date.now(),
    });
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
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!member || (member.role !== "admin" && member.role !== "lead")) {
      throw new Error("Only admins and leads can update meetings");
    }

    const { meetingId, ...updates } = args;
    await ctx.db.patch(meetingId, updates);
  },
});

export const deleteMeeting = mutation({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!member || (member.role !== "admin" && member.role !== "lead")) {
      throw new Error("Only admins and leads can delete meetings");
    }

    await ctx.db.delete(args.meetingId);
  },
});
