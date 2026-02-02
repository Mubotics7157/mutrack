import {
  query,
  mutation,
  internalQuery,
  internalMutation,
} from "./_generated/server";
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
  const key = `mlw_${hex}`; // ml worker prefix
  const prefix = key.substring(0, 12);
  return { key, prefix };
}

async function requireAdmin(ctx: any, userId: string) {
  const member = await ctx.db
    .query("members")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .unique();

  if (!member || member.role !== "admin") {
    throw new Error("Only admins can manage ML workers");
  }
  return member;
}

// ============================================
// PUBLIC QUERIES & MUTATIONS (admin UI)
// ============================================

/**
 * List all ML workers (admin only)
 */
export const listWorkers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!member || member.role !== "admin") return [];

    const workers = await ctx.db.query("mlWorkers").collect();

    const now = Date.now();
    const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

    return workers.map((w) => ({
      _id: w._id,
      name: w.name,
      apiKeyPrefix: w.apiKeyPrefix,
      capabilities: w.capabilities,
      isActive: w.isActive,
      lastHeartbeatAt: w.lastHeartbeatAt,
      isOnline: w.lastHeartbeatAt
        ? now - w.lastHeartbeatAt < ONLINE_THRESHOLD_MS
        : false,
      currentJobId: w.currentJobId,
      jobsCompleted: w.jobsCompleted ?? 0,
      averageProcessingTime: w.averageProcessingTime,
      metadata: w.metadata,
      createdAt: w.createdAt,
    }));
  },
});

/**
 * Register a new ML worker (admin only)
 */
export const registerWorker = mutation({
  args: {
    name: v.string(),
    capabilities: v.array(v.string()),
    metadata: v.optional(
      v.object({
        gpuModel: v.optional(v.string()),
        platform: v.optional(v.string()),
        version: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const admin = await requireAdmin(ctx, userId);

    const { key, prefix } = generateApiKey();
    const apiKeyHash = await hashApiKey(key);

    const workerId = await ctx.db.insert("mlWorkers", {
      name: args.name,
      apiKeyHash,
      apiKeyPrefix: prefix,
      capabilities: args.capabilities,
      isActive: true,
      registeredBy: admin._id,
      createdAt: Date.now(),
      jobsCompleted: 0,
      metadata: args.metadata,
    });

    // Return API key - only shown once
    return { workerId, apiKey: key };
  },
});

/**
 * Update ML worker settings (admin only)
 */
export const updateWorker = mutation({
  args: {
    workerId: v.id("mlWorkers"),
    name: v.optional(v.string()),
    capabilities: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await requireAdmin(ctx, userId);

    const worker = await ctx.db.get(args.workerId);
    if (!worker) throw new Error("Worker not found");

    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.capabilities !== undefined) updates.capabilities = args.capabilities;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.workerId, updates);
  },
});

/**
 * Regenerate API key for worker (admin only)
 */
export const regenerateApiKey = mutation({
  args: { workerId: v.id("mlWorkers") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await requireAdmin(ctx, userId);

    const worker = await ctx.db.get(args.workerId);
    if (!worker) throw new Error("Worker not found");

    const { key, prefix } = generateApiKey();
    const apiKeyHash = await hashApiKey(key);

    await ctx.db.patch(args.workerId, {
      apiKeyHash,
      apiKeyPrefix: prefix,
    });

    return { apiKey: key };
  },
});

/**
 * Delete ML worker (admin only)
 */
export const deleteWorker = mutation({
  args: { workerId: v.id("mlWorkers") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await requireAdmin(ctx, userId);

    const worker = await ctx.db.get(args.workerId);
    if (!worker) throw new Error("Worker not found");

    await ctx.db.delete(args.workerId);
  },
});

// ============================================
// INTERNAL FUNCTIONS (for HTTP API)
// ============================================

/**
 * Validate API key and return worker info
 */
export const validateApiKey = internalQuery({
  args: { apiKeyHash: v.string() },
  handler: async (ctx, args) => {
    const worker = await ctx.db
      .query("mlWorkers")
      .withIndex("by_apiKeyHash", (q) => q.eq("apiKeyHash", args.apiKeyHash))
      .unique();

    if (!worker || !worker.isActive) return null;

    return {
      workerId: worker._id,
      name: worker.name,
      capabilities: worker.capabilities,
    };
  },
});

/**
 * Update worker heartbeat and optionally metadata
 */
export const updateHeartbeat = internalMutation({
  args: {
    workerId: v.id("mlWorkers"),
    currentJobId: v.optional(v.id("processingJobs")),
    metadata: v.optional(
      v.object({
        gpuModel: v.optional(v.string()),
        platform: v.optional(v.string()),
        version: v.optional(v.string()),
      })
    ),
    incrementCompletedCount: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const worker = await ctx.db.get(args.workerId);
    if (!worker) return;

    const updates: any = {
      lastHeartbeatAt: Date.now(),
    };

    if (args.currentJobId !== undefined) {
      updates.currentJobId = args.currentJobId;
    }

    if (args.metadata) {
      updates.metadata = args.metadata;
    }

    if (args.incrementCompletedCount) {
      updates.jobsCompleted = (worker.jobsCompleted ?? 0) + 1;
    }

    await ctx.db.patch(args.workerId, updates);
  },
});
