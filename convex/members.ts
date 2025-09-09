import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

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

    if (!currentMember || (currentMember.role !== "admin" && currentMember.role !== "lead")) {
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
          role,
          joinedAt: Date.now(),
        });
        return await ctx.db.get(newMemberId);
      }
    }

    return existingMember;
  },
});

export const updateMemberRole = mutation({
  args: {
    memberId: v.id("members"),
    newRole: v.union(v.literal("admin"), v.literal("lead"), v.literal("member")),
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
