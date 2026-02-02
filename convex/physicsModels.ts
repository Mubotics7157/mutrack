import {
  query,
  mutation,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ============================================
// PUBLIC QUERIES (for frontend)
// ============================================

/**
 * Get the current active physics model
 */
export const getActiveModel = query({
  args: {
    modelType: v.optional(
      v.union(v.literal("drag_magnus"), v.literal("full_aerodynamic"))
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const modelType = args.modelType ?? "drag_magnus";

    const model = await ctx.db
      .query("physicsModels")
      .withIndex("by_modelType_status", (q) =>
        q.eq("modelType", modelType).eq("status", "active")
      )
      .first();

    if (!model) return null;

    return {
      _id: model._id,
      name: model.name,
      version: model.version,
      modelType: model.modelType,
      parameters: model.parameters,
      parameterUncertainties: model.parameterUncertainties,
      fittingStats: model.fittingStats,
      status: model.status,
      createdAt: model.createdAt,
    };
  },
});

/**
 * Get a specific physics model by ID
 */
export const getModel = query({
  args: { modelId: v.id("physicsModels") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const model = await ctx.db.get(args.modelId);
    if (!model) return null;

    let creatorName = "System";
    if (model.createdBy) {
      const creator = await ctx.db.get(model.createdBy);
      creatorName = creator?.name ?? "Unknown";
    }

    return {
      _id: model._id,
      name: model.name,
      version: model.version,
      modelType: model.modelType,
      parameters: model.parameters,
      parameterUncertainties: model.parameterUncertainties,
      fittingStats: model.fittingStats,
      status: model.status,
      createdBy: creatorName,
      createdAt: model.createdAt,
    };
  },
});

/**
 * List all physics models
 */
export const listModels = query({
  args: {
    modelType: v.optional(
      v.union(v.literal("drag_magnus"), v.literal("full_aerodynamic"))
    ),
    includeSuperseded: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let models;
    if (args.modelType) {
      models = await ctx.db
        .query("physicsModels")
        .filter((q) => q.eq(q.field("modelType"), args.modelType))
        .order("desc")
        .collect();
    } else {
      models = await ctx.db.query("physicsModels").order("desc").collect();
    }

    // Filter out superseded unless requested
    if (!args.includeSuperseded) {
      models = models.filter((m) => m.status !== "superseded");
    }

    return models.map((m) => ({
      _id: m._id,
      name: m.name,
      version: m.version,
      modelType: m.modelType,
      status: m.status,
      fittingStats: m.fittingStats,
      createdAt: m.createdAt,
    }));
  },
});

/**
 * Get trajectories used for model fitting
 */
export const getTrajectories = query({
  args: {
    validOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const limit = args.limit ?? 100;

    let trajectories;
    if (args.validOnly) {
      trajectories = await ctx.db
        .query("trajectories")
        .withIndex("by_isValid", (q) => q.eq("isValid", true))
        .order("desc")
        .take(limit);
    } else {
      trajectories = await ctx.db
        .query("trajectories")
        .order("desc")
        .take(limit);
    }

    // Get video details for each trajectory
    const trajectoriesWithDetails = await Promise.all(
      trajectories.map(async (t) => {
        const video = await ctx.db.get(t.videoId);
        return {
          _id: t._id,
          videoId: t.videoId,
          robot: video?.robot,
          flywheelRpm: video?.flywheelRpm,
          hoodAngle: video?.hoodAngle,
          frameCount: t.frameCount,
          detectedFrameCount: t.detectedFrameCount,
          averageConfidence: t.averageConfidence,
          launchAngle: t.launchAngle,
          launchSpeed: t.launchSpeed,
          maxHeight: t.maxHeight,
          horizontalDistance: t.horizontalDistance,
          flightTime: t.flightTime,
          isValid: t.isValid,
          qualityScore: t.qualityScore,
          createdAt: t.createdAt,
        };
      })
    );

    return trajectoriesWithDetails;
  },
});

/**
 * Get a single trajectory with full details
 */
export const getTrajectory = query({
  args: { trajectoryId: v.id("trajectories") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const trajectory = await ctx.db.get(args.trajectoryId);
    if (!trajectory) return null;

    const video = await ctx.db.get(trajectory.videoId);
    const videoUrl = video
      ? await ctx.storage.getUrl(video.videoStorageId)
      : null;

    let calibration = null;
    if (trajectory.calibrationId) {
      const cal = await ctx.db.get(trajectory.calibrationId);
      if (cal) {
        calibration = {
          deviceId: cal.deviceId,
          deviceName: cal.deviceName,
          fx: cal.fx,
          fy: cal.fy,
          cx: cal.cx,
          cy: cal.cy,
        };
      }
    }

    return {
      _id: trajectory._id,
      videoId: trajectory.videoId,
      videoUrl,
      video: video
        ? {
            robot: video.robot,
            flywheelRpm: video.flywheelRpm,
            hoodAngle: video.hoodAngle,
            frameRate: video.frameRate,
            duration: video.duration,
          }
        : null,
      calibration,
      positions: trajectory.positions, // JSON string - parse on frontend
      frameCount: trajectory.frameCount,
      detectedFrameCount: trajectory.detectedFrameCount,
      averageConfidence: trajectory.averageConfidence,
      launchAngle: trajectory.launchAngle,
      launchSpeed: trajectory.launchSpeed,
      maxHeight: trajectory.maxHeight,
      horizontalDistance: trajectory.horizontalDistance,
      flightTime: trajectory.flightTime,
      isValid: trajectory.isValid,
      qualityScore: trajectory.qualityScore,
      qualityNotes: trajectory.qualityNotes,
      createdAt: trajectory.createdAt,
    };
  },
});

/**
 * Get trajectory for a video
 */
export const getTrajectoryForVideo = query({
  args: { videoId: v.id("shootingVideos") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const trajectory = await ctx.db
      .query("trajectories")
      .withIndex("by_video", (q) => q.eq("videoId", args.videoId))
      .order("desc")
      .first();

    if (!trajectory) return null;

    return {
      _id: trajectory._id,
      positions: trajectory.positions,
      frameCount: trajectory.frameCount,
      detectedFrameCount: trajectory.detectedFrameCount,
      averageConfidence: trajectory.averageConfidence,
      launchAngle: trajectory.launchAngle,
      launchSpeed: trajectory.launchSpeed,
      maxHeight: trajectory.maxHeight,
      horizontalDistance: trajectory.horizontalDistance,
      flightTime: trajectory.flightTime,
      isValid: trajectory.isValid,
      qualityScore: trajectory.qualityScore,
      qualityNotes: trajectory.qualityNotes,
      createdAt: trajectory.createdAt,
    };
  },
});

// ============================================
// PUBLIC MUTATIONS (admin only)
// ============================================

/**
 * Create a new physics model (admin only)
 */
export const createModel = mutation({
  args: {
    name: v.string(),
    modelType: v.union(
      v.literal("drag_magnus"),
      v.literal("full_aerodynamic")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!member || member.role !== "admin") {
      throw new Error("Only admins can create physics models");
    }

    // Get next version number
    const existingModels = await ctx.db
      .query("physicsModels")
      .filter((q) => q.eq(q.field("modelType"), args.modelType))
      .collect();

    const maxVersion = existingModels.reduce(
      (max, m) => Math.max(max, m.version),
      0
    );

    const modelId = await ctx.db.insert("physicsModels", {
      name: args.name,
      version: maxVersion + 1,
      modelType: args.modelType,
      parameters: {},
      fittingStats: {
        trajectoryCount: 0,
        videoCount: 0,
        rmse: 0,
        r2Score: 0,
        fittedAt: Date.now(),
      },
      status: "training",
      createdBy: member._id,
      createdAt: Date.now(),
    });

    return modelId;
  },
});

/**
 * Activate a model (makes it the current active model)
 */
export const activateModel = mutation({
  args: { modelId: v.id("physicsModels") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!member || member.role !== "admin") {
      throw new Error("Only admins can activate physics models");
    }

    const model = await ctx.db.get(args.modelId);
    if (!model) throw new Error("Model not found");

    // Supersede current active model of same type
    const currentActive = await ctx.db
      .query("physicsModels")
      .withIndex("by_modelType_status", (q) =>
        q.eq("modelType", model.modelType).eq("status", "active")
      )
      .first();

    if (currentActive) {
      await ctx.db.patch(currentActive._id, { status: "superseded" });
    }

    // Activate the new model
    await ctx.db.patch(args.modelId, { status: "active" });
  },
});

/**
 * Mark a trajectory as valid/invalid (for quality control)
 */
export const updateTrajectoryValidity = mutation({
  args: {
    trajectoryId: v.id("trajectories"),
    isValid: v.boolean(),
    qualityNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!member) throw new Error("Member not found");

    const trajectory = await ctx.db.get(args.trajectoryId);
    if (!trajectory) throw new Error("Trajectory not found");

    await ctx.db.patch(args.trajectoryId, {
      isValid: args.isValid,
      qualityNotes: args.qualityNotes,
    });
  },
});

// ============================================
// INTERNAL MUTATIONS (for ML workers)
// ============================================

/**
 * Update model parameters after fitting
 */
export const updateModelParameters = internalMutation({
  args: {
    modelId: v.id("physicsModels"),
    parameters: v.object({
      dragCoefficient: v.optional(v.number()),
      magnusCoefficient: v.optional(v.number()),
      liftCoefficient: v.optional(v.number()),
      ballMass: v.optional(v.number()),
      ballDiameter: v.optional(v.number()),
      ballMomentOfInertia: v.optional(v.number()),
      motorCurve: v.optional(v.array(v.number())),
      hoodAngleBias: v.optional(v.number()),
      spinRatio: v.optional(v.number()),
    }),
    parameterUncertainties: v.optional(
      v.object({
        dragCoefficient: v.optional(v.number()),
        magnusCoefficient: v.optional(v.number()),
        hoodAngleBias: v.optional(v.number()),
      })
    ),
    fittingStats: v.object({
      trajectoryCount: v.number(),
      videoCount: v.number(),
      rmse: v.number(),
      r2Score: v.number(),
      fittedAt: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const model = await ctx.db.get(args.modelId);
    if (!model) return { success: false, error: "Model not found" };

    await ctx.db.patch(args.modelId, {
      parameters: args.parameters,
      parameterUncertainties: args.parameterUncertainties,
      fittingStats: args.fittingStats,
    });

    return { success: true };
  },
});

/**
 * List all trajectories (internal, no auth) - for debugging
 */
export const listTrajectoriesInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const trajectories = await ctx.db.query("trajectories").collect();
    return trajectories.map((t) => ({
      _id: t._id,
      videoId: t.videoId,
      isValid: t.isValid,
      launchAngle: t.launchAngle,
      launchSpeed: t.launchSpeed,
      maxHeight: t.maxHeight,
      horizontalDistance: t.horizontalDistance,
      detectedFrameCount: t.detectedFrameCount,
      averageConfidence: t.averageConfidence,
    }));
  },
});
