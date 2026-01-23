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
