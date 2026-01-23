import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateApiKey(): { key: string; prefix: string } {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const hex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const key = `msk_${hex}`;
  const prefix = key.substring(0, 12);
  return { key, prefix };
}

async function requireAdmin(ctx: any, userId: string) {
  const member = await ctx.db
    .query("members")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .unique();

  if (!member || member.role !== "admin") {
    throw new Error("Only admins can manage scanners");
  }
  return member;
}

export const listScanners = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!member || member.role !== "admin") return [];

    const scanners = await ctx.db.query("scanners").collect();

    const now = Date.now();
    const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

    return scanners.map((s) => ({
      _id: s._id,
      name: s.name,
      apiKeyPrefix: s.apiKeyPrefix,
      location: s.location,
      createdAt: s.createdAt,
      lastSeenAt: s.lastSeenAt,
      isActive: s.isActive,
      isOnline: s.lastSeenAt ? now - s.lastSeenAt < ONLINE_THRESHOLD_MS : false,
      metadata: s.metadata,
    }));
  },
});

export const getScannerById = query({
  args: { scannerId: v.id("scanners") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!member || member.role !== "admin") return null;

    const scanner = await ctx.db.get(args.scannerId);
    if (!scanner) return null;

    const now = Date.now();
    const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

    return {
      _id: scanner._id,
      name: scanner.name,
      apiKeyPrefix: scanner.apiKeyPrefix,
      location: scanner.location,
      createdAt: scanner.createdAt,
      lastSeenAt: scanner.lastSeenAt,
      isActive: scanner.isActive,
      isOnline: scanner.lastSeenAt
        ? now - scanner.lastSeenAt < ONLINE_THRESHOLD_MS
        : false,
      metadata: scanner.metadata,
    };
  },
});

export const registerScanner = mutation({
  args: {
    name: v.string(),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const admin = await requireAdmin(ctx, userId);

    const { key, prefix } = generateApiKey();
    const apiKeyHash = await hashApiKey(key);

    const scannerId = await ctx.db.insert("scanners", {
      name: args.name,
      apiKeyHash,
      apiKeyPrefix: prefix,
      location: args.location,
      registeredBy: admin._id,
      createdAt: Date.now(),
      isActive: true,
    });

    // Return the API key - this is the only time it will be shown
    return { scannerId, apiKey: key };
  },
});

export const updateScanner = mutation({
  args: {
    scannerId: v.id("scanners"),
    name: v.optional(v.string()),
    location: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await requireAdmin(ctx, userId);

    const scanner = await ctx.db.get(args.scannerId);
    if (!scanner) throw new Error("Scanner not found");

    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.location !== undefined) updates.location = args.location;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.scannerId, updates);
    return null;
  },
});

export const regenerateApiKey = mutation({
  args: { scannerId: v.id("scanners") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await requireAdmin(ctx, userId);

    const scanner = await ctx.db.get(args.scannerId);
    if (!scanner) throw new Error("Scanner not found");

    const { key, prefix } = generateApiKey();
    const apiKeyHash = await hashApiKey(key);

    await ctx.db.patch(args.scannerId, {
      apiKeyHash,
      apiKeyPrefix: prefix,
    });

    // Return the new API key - this is the only time it will be shown
    return { apiKey: key };
  },
});

export const deleteScanner = mutation({
  args: { scannerId: v.id("scanners") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await requireAdmin(ctx, userId);

    const scanner = await ctx.db.get(args.scannerId);
    if (!scanner) throw new Error("Scanner not found");

    await ctx.db.delete(args.scannerId);
    return null;
  },
});

// Internal functions for HTTP handlers

export const validateApiKey = internalQuery({
  args: { apiKeyHash: v.string() },
  handler: async (ctx, args) => {
    const scanner = await ctx.db
      .query("scanners")
      .withIndex("by_apiKeyHash", (q) => q.eq("apiKeyHash", args.apiKeyHash))
      .unique();

    if (!scanner || !scanner.isActive) return null;

    return {
      _id: scanner._id,
      name: scanner.name,
      location: scanner.location,
    };
  },
});

export const updateHeartbeat = internalMutation({
  args: {
    scannerId: v.id("scanners"),
    metadata: v.optional(
      v.object({
        platform: v.optional(v.string()),
        version: v.optional(v.string()),
        hostname: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const scanner = await ctx.db.get(args.scannerId);
    if (!scanner) return;

    const updates: any = { lastSeenAt: Date.now() };
    if (args.metadata) {
      updates.metadata = args.metadata;
    }

    await ctx.db.patch(args.scannerId, updates);
  },
});

// Helper to hash API key (exported for HTTP handler)
export const hashApiKeyForValidation = async (key: string): Promise<string> => {
  return hashApiKey(key);
};

// Track an unpaired beacon sighting
export const trackUnpairedBeacon = internalMutation({
  args: {
    uuid: v.string(),
    major: v.number(),
    minor: v.number(),
    scannerId: v.id("scanners"),
  },
  handler: async (ctx, args) => {
    const key = `ibeacon:${args.uuid.toLowerCase().trim()}:${args.major}:${args.minor}`;

    // Check if already tracked
    const existing = await ctx.db
      .query("unpairedBeacons")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();

    const now = Date.now();

    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        lastSeenAt: now,
        lastSeenByScannerId: args.scannerId,
        sightingCount: existing.sightingCount + 1,
      });
    } else {
      // Create new record
      await ctx.db.insert("unpairedBeacons", {
        key,
        uuid: args.uuid.toLowerCase().trim(),
        major: args.major,
        minor: args.minor,
        firstSeenAt: now,
        lastSeenAt: now,
        lastSeenByScannerId: args.scannerId,
        sightingCount: 1,
      });
    }
  },
});

// List unpaired beacons for admin UI
export const listUnpairedBeacons = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!member || member.role !== "admin") return [];

    const unpaired = await ctx.db
      .query("unpairedBeacons")
      .withIndex("by_lastSeenAt")
      .order("desc")
      .take(50);

    const now = Date.now();
    const RECENT_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

    return unpaired.map((b) => ({
      _id: b._id,
      key: b.key,
      uuid: b.uuid,
      major: b.major,
      minor: b.minor,
      firstSeenAt: b.firstSeenAt,
      lastSeenAt: b.lastSeenAt,
      sightingCount: b.sightingCount,
      isRecent: now - b.lastSeenAt < RECENT_THRESHOLD_MS,
    }));
  },
});

// Pair an unpaired beacon to a member
export const pairUnpairedBeaconToMember = mutation({
  args: {
    unpairedBeaconId: v.id("unpairedBeacons"),
    memberId: v.id("members"),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await requireAdmin(ctx, userId);

    const unpaired = await ctx.db.get(args.unpairedBeaconId);
    if (!unpaired) throw new Error("Unpaired beacon not found");

    const target = await ctx.db.get(args.memberId);
    if (!target) throw new Error("Member not found");

    // Check if already paired
    const existing = await ctx.db
      .query("beacons")
      .withIndex("by_key", (q) => q.eq("key", unpaired.key))
      .unique();

    if (existing) {
      throw new Error("This beacon is already paired to a member");
    }

    // Create the beacon record
    await ctx.db.insert("beacons", {
      key: unpaired.key,
      type: "ibeacon" as const,
      label: args.label,
      ownerMemberId: args.memberId,
      createdAt: Date.now(),
    });

    // Delete from unpaired
    await ctx.db.delete(args.unpairedBeaconId);

    return null;
  },
});

// Delete/dismiss an unpaired beacon
export const dismissUnpairedBeacon = mutation({
  args: { unpairedBeaconId: v.id("unpairedBeacons") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await requireAdmin(ctx, userId);

    await ctx.db.delete(args.unpairedBeaconId);
    return null;
  },
});
