import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

function canonicalizeUuid(uuid: string): string {
  return uuid.trim().toLowerCase();
}

function buildIbeaconKey(uuid: string, major: number, minor: number): string {
  const u = canonicalizeUuid(uuid);
  return `ibeacon:${u}:${major}:${minor}`;
}

export const listMyBeacons = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("beacons"),
      key: v.string(),
      type: v.union(
        v.literal("ibeacon"),
        v.literal("eddystone"),
        v.literal("other")
      ),
      label: v.optional(v.string()),
      ownerMemberId: v.id("members"),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const owner = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!owner) return [];
    const beacons = await ctx.db
      .query("beacons")
      .withIndex("by_owner", (q) => q.eq("ownerMemberId", owner._id))
      .collect();
    return beacons.map((b) => ({
      _id: b._id,
      key: b.key,
      type: b.type,
      label: b.label,
      ownerMemberId: b.ownerMemberId,
      createdAt: b.createdAt,
    }));
  },
});

export const pairIbeacon = mutation({
  args: {
    uuid: v.string(),
    major: v.number(),
    minor: v.number(),
    label: v.optional(v.string()),
  },
  returns: v.id("beacons"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const owner = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!owner) throw new Error("Member not found");

    const key = buildIbeaconKey(args.uuid, args.major, args.minor);

    const existing = await ctx.db
      .query("beacons")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (existing) {
      if (existing.ownerMemberId !== owner._id) {
        throw new Error("Beacon already paired to another member");
      }
      // Same owner: update label if provided and return
      if (args.label && args.label !== existing.label) {
        await ctx.db.patch(existing._id, { label: args.label });
      }
      return existing._id;
    }

    const beaconId = await ctx.db.insert("beacons", {
      key,
      type: "ibeacon" as const,
      label: args.label,
      ownerMemberId: owner._id,
      createdAt: Date.now(),
    });
    return beaconId;
  },
});

export const unpairBeacon = mutation({
  args: { beaconId: v.id("beacons") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const owner = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!owner) throw new Error("Member not found");

    const beacon = await ctx.db.get(args.beaconId);
    if (!beacon) return null;
    if (beacon.ownerMemberId !== owner._id) {
      throw new Error("Cannot unpair beacon not owned by you");
    }
    await ctx.db.delete(args.beaconId);
    return null;
  },
});

export const setBeaconLabel = mutation({
  args: { beaconId: v.id("beacons"), label: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const owner = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!owner) throw new Error("Member not found");
    const beacon = await ctx.db.get(args.beaconId);
    if (!beacon) return null;
    if (beacon.ownerMemberId !== owner._id) {
      throw new Error("Cannot edit beacon not owned by you");
    }
    await ctx.db.patch(args.beaconId, { label: args.label });
    return null;
  },
});

export const adminPairIbeaconToMember = mutation({
  args: {
    memberId: v.id("members"),
    uuid: v.string(),
    major: v.number(),
    minor: v.number(),
    label: v.optional(v.string()),
  },
  returns: v.id("beacons"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const actor = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!actor || (actor.role !== "admin" && actor.role !== "lead")) {
      throw new Error("Only admins or leads can assign beacons");
    }

    const target = await ctx.db.get(args.memberId);
    if (!target) throw new Error("Target member not found");

    const key = buildIbeaconKey(args.uuid, args.major, args.minor);
    const existing = await ctx.db
      .query("beacons")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (existing) {
      // If already owned by someone else, deny
      if (existing.ownerMemberId !== args.memberId) {
        throw new Error("Beacon already paired to a different member");
      }
      if (args.label && args.label !== existing.label) {
        await ctx.db.patch(existing._id, { label: args.label });
      }
      return existing._id;
    }

    const beaconId = await ctx.db.insert("beacons", {
      key,
      type: "ibeacon" as const,
      label: args.label,
      ownerMemberId: args.memberId,
      createdAt: Date.now(),
    });
    return beaconId;
  },
});

export const findMemberByBeaconKey = internalQuery({
  args: { key: v.string() },
  returns: v.union(v.id("members"), v.null()),
  handler: async (ctx, args) => {
    const beacon = await ctx.db
      .query("beacons")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    if (!beacon) return null;
    return beacon.ownerMemberId;
  },
});

export const buildKeyForIbeacon = internalQuery({
  args: { uuid: v.string(), major: v.number(), minor: v.number() },
  returns: v.string(),
  handler: async (_ctx, args) => {
    return buildIbeaconKey(args.uuid, args.major, args.minor);
  },
});

export const listAllForAdmin = query({
  args: {},
  returns: v.array(
    v.object({ key: v.string(), ownerMemberId: v.id("members") })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const actor = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!actor || (actor.role !== "admin" && actor.role !== "lead")) return [];
    const all = await ctx.db.query("beacons").collect();
    return all.map((b) => ({ key: b.key, ownerMemberId: b.ownerMemberId }));
  },
});
