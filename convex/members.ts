import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internalQuery } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

async function memberWithProfileImageUrl(
  ctx: { storage: { getUrl: (id: Id<"_storage">) => Promise<string | null> } },
  member: Doc<"members">
) {
  const profileImageUrl = member.profileImageId
    ? await ctx.storage.getUrl(member.profileImageId)
    : null;
  return { ...member, profileImageUrl: profileImageUrl ?? null };
}
export const getCurrentMember = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!member) return null;

    return await memberWithProfileImageUrl(ctx, member);
  },
});

export const getAllMembers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    // Allow all authenticated members to view list
    const members = await ctx.db.query("members").collect();
    return await Promise.all(
      members.map((member) => memberWithProfileImageUrl(ctx, member))
    );
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

export const generateProfileImageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.storage.generateUploadUrl();
  },
});

export const setProfileImage = mutation({
  args: {
    storageId: v.union(v.id("_storage"), v.null()),
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

    const patch: Partial<Doc<"members">> = args.storageId
      ? { profileImageId: args.storageId }
      : { profileImageId: undefined };

    await ctx.db.patch(member._id, patch);
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

export const awardMuPoint = mutation({
  args: {
    memberId: v.id("members"),
    points: v.number(),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const awardingMember = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!awardingMember) throw new Error("Member not found");

    if (awardingMember.role !== "admin" && awardingMember.role !== "lead") {
      throw new Error("Only admins and leads can award μpoints");
    }

    const targetMember = await ctx.db.get(args.memberId);
    if (!targetMember) throw new Error("Target member not found");

    const trimmedReason = args.reason.trim();
    if (!trimmedReason) {
      throw new Error("A reason is required to award μpoints");
    }

    if (!Number.isFinite(args.points) || args.points <= 0) {
      throw new Error("Points must be a positive number");
    }

    await ctx.db.insert("muPoints", {
      memberId: args.memberId,
      assignedByMemberId: awardingMember._id,
      points: args.points,
      reason: trimmedReason,
      createdAt: Date.now(),
    });

    return null;
  },
});

export const getLeaderboard = query({
  args: {},
  returns: v.array(
    v.object({
      memberId: v.id("members"),
      name: v.string(),
      email: v.string(),
      role: v.union(
        v.literal("admin"),
        v.literal("lead"),
        v.literal("member")
      ),
      totalPoints: v.number(),
      awardsCount: v.number(),
      lastAwardedAt: v.union(v.number(), v.null()),
      profileImageUrl: v.union(v.string(), v.null()),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const members = await ctx.db.query("members").collect();
    const membersWithImages = await Promise.all(
      members.map((member) => memberWithProfileImageUrl(ctx, member))
    );
    const imageMap = new Map(
      membersWithImages.map((member) => [member._id, member.profileImageUrl])
    );
    const awards = await ctx.db.query("muPoints").collect();

    const totals = new Map<Id<"members">, {
      total: number;
      count: number;
      lastAwarded: number | null;
    }>();

    for (const member of members) {
      totals.set(member._id, { total: 0, count: 0, lastAwarded: null });
    }

    for (const award of awards) {
      const current = totals.get(award.memberId);
      if (!current) continue;
      current.total += award.points;
      current.count += 1;
      current.lastAwarded = current.lastAwarded
        ? Math.max(current.lastAwarded, award.createdAt)
        : award.createdAt;
    }

    const leaderboard = members.map((member) => {
      const summary = totals.get(member._id)!;
      return {
        memberId: member._id,
        name: member.name,
        email: member.email,
        role: member.role,
        totalPoints: summary.total,
        awardsCount: summary.count,
        lastAwardedAt: summary.lastAwarded,
        profileImageUrl: imageMap.get(member._id) ?? null,
      };
    });

    leaderboard.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      const lastAwardedDiff = (b.lastAwardedAt ?? 0) - (a.lastAwardedAt ?? 0);
      if (lastAwardedDiff !== 0) {
        return lastAwardedDiff;
      }
      return a.name.localeCompare(b.name);
    });

    return leaderboard;
  },
});

export const getMemberMuPoints = query({
  args: { memberId: v.id("members") },
  returns: v.array(
    v.object({
      _id: v.id("muPoints"),
      points: v.number(),
      reason: v.string(),
      createdAt: v.number(),
      assignedBy: v.object({
        memberId: v.id("members"),
        name: v.string(),
        role: v.union(
          v.literal("admin"),
          v.literal("lead"),
          v.literal("member")
        ),
      }),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const awards = await ctx.db
      .query("muPoints")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .collect();

    awards.sort((a, b) => b.createdAt - a.createdAt);

    const assignerIds = Array.from(
      new Set(awards.map((award) => award.assignedByMemberId))
    );

    const assigners = await Promise.all(
      assignerIds.map((assignerId) => ctx.db.get(assignerId))
    );

    const assignerMap = new Map<Id<"members">, typeof assigners[number]>();
    for (const assigner of assigners) {
      if (assigner) {
        assignerMap.set(assigner._id, assigner);
      }
    }

    return awards.map((award) => {
      const assigner = assignerMap.get(award.assignedByMemberId);
      return {
        _id: award._id,
        points: award.points,
        reason: award.reason,
        createdAt: award.createdAt,
        assignedBy: {
          memberId: award.assignedByMemberId,
          name: assigner?.name ?? "Unknown", 
          role: assigner?.role ?? "member",
        },
      };
    });
  },
});

export const deleteMember = mutation({
  args: { memberId: v.id("members") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const currentMember = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!currentMember || currentMember.role !== "admin") {
      throw new Error("Only admins can delete members");
    }

    // Clean up subscriptions
    const subs = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .collect();
    for (const s of subs) await ctx.db.delete(s._id);

    // Clean up RSVPs
    const rsvps = await ctx.db
      .query("meetingRsvps")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .collect();
    for (const r of rsvps) await ctx.db.delete(r._id);

    // Finally delete member
    await ctx.db.delete(args.memberId);
    return null;
  },
});
