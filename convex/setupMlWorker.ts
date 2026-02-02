/**
 * Setup script for registering ML workers.
 * Run from Convex dashboard: Functions > setupMlWorker > registerLocalWorker
 */

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

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
  const key = `mlw_${hex}`;
  const prefix = key.substring(0, 12);
  return { key, prefix };
}

/**
 * Register a local development ML worker.
 * Run this from the Convex dashboard to get an API key.
 */
export const registerLocalWorker = internalMutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const workerName = args.name || "local-dev-worker";

    // Check if worker already exists
    const existing = await ctx.db
      .query("mlWorkers")
      .filter((q) => q.eq(q.field("name"), workerName))
      .first();

    if (existing) {
      // Regenerate key for existing worker
      const { key, prefix } = generateApiKey();
      const apiKeyHash = await hashApiKey(key);

      await ctx.db.patch(existing._id, {
        apiKeyHash,
        apiKeyPrefix: prefix,
        isActive: true,
      });

      return {
        message: `Updated existing worker: ${workerName}`,
        workerId: existing._id,
        apiKey: key,
        instructions: "Copy this API key to your .env file as BALLISTICS_ML_WORKER_API_KEY",
      };
    }

    // Get any admin member to use as registeredBy
    const anyMember = await ctx.db.query("members").first();
    if (!anyMember) {
      throw new Error("No members found. Please create a user first.");
    }

    const { key, prefix } = generateApiKey();
    const apiKeyHash = await hashApiKey(key);

    const workerId = await ctx.db.insert("mlWorkers", {
      name: workerName,
      apiKeyHash,
      apiKeyPrefix: prefix,
      capabilities: ["trajectory_detection", "parameter_fitting"],
      isActive: true,
      registeredBy: anyMember._id,
      createdAt: Date.now(),
      jobsCompleted: 0,
      metadata: {
        platform: "local",
        version: "0.1.0",
      },
    });

    return {
      message: `Registered new worker: ${workerName}`,
      workerId,
      apiKey: key,
      instructions: "Copy this API key to your .env file as BALLISTICS_ML_WORKER_API_KEY",
    };
  },
});
