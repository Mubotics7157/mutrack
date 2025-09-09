import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internalQuery } from "./_generated/server";

export const getCurrentMember = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    // Member will be created via mutation if needed

    return member;
  },
});

export const getAllMembers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const currentMember = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (
      !currentMember ||
      (currentMember.role !== "admin" && currentMember.role !== "lead")
    ) {
      return [];
    }

    return await ctx.db.query("members").collect();
  },
});

export const createMemberIfNotExists = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existingMember = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!existingMember) {
      const user = await ctx.db.get(userId);
      if (user) {
        // Check if this is the first member - make them admin
        const memberCount = await ctx.db.query("members").collect();
        const role = memberCount.length === 0 ? "admin" : "member";

        const newMemberId = await ctx.db.insert("members", {
          userId,
          name: user.name || user.email || "Unknown",
          email: user.email || "",
          onboardingCompleted: false,
          notificationsEnabled: false,
          role,
          joinedAt: Date.now(),
        });
        return await ctx.db.get(newMemberId);
      }
    }

    return existingMember;
  },
});

export const completeOnboarding = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    phoneNumber: v.string(),
    notificationsEnabled: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!member) throw new Error("Member not found");

    const fullName = `${args.firstName} ${args.lastName}`.trim();
    await ctx.db.patch(member._id, {
      firstName: args.firstName,
      lastName: args.lastName,
      phoneNumber: args.phoneNumber,
      notificationsEnabled: args.notificationsEnabled,
      onboardingCompleted: true,
      name: fullName,
    });
    return null;
  },
});

export const savePushSubscription = mutation({
  args: {
    endpoint: v.string(),
    keys: v.object({
      p256dh: v.string(),
      auth: v.string(),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!member) throw new Error("Member not found");

    // Upsert by endpoint
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        memberId: member._id,
        keys: args.keys,
      });
    } else {
      await ctx.db.insert("pushSubscriptions", {
        memberId: member._id,
        endpoint: args.endpoint,
        keys: args.keys,
        createdAt: Date.now(),
      });
    }
    return null;
  },
});

export const listEnabledMembersQuery = internalQuery({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const members = await ctx.db
      .query("members")
      .withIndex("by_notifications_enabled", (q) =>
        q.eq("notificationsEnabled", true)
      )
      .collect();
    return members;
  },
});

export const internalListSubscriptionsForMember = internalQuery({
  args: { memberId: v.id("members") },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const subs = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .collect();
    return subs;
  },
});

export const setNotificationsEnabled = mutation({
  args: { enabled: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!member) throw new Error("Member not found");
    await ctx.db.patch(member._id, { notificationsEnabled: args.enabled });
    return null;
  },
});

export const updateMemberRole = mutation({
  args: {
    memberId: v.id("members"),
    newRole: v.union(
      v.literal("admin"),
      v.literal("lead"),
      v.literal("member")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const currentMember = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!currentMember || currentMember.role !== "admin") {
      throw new Error("Only admins can update member roles");
    }

    await ctx.db.patch(args.memberId, { role: args.newRole });
  },
});
