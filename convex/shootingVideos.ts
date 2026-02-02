import { v } from "convex/values";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const createVideo = mutation({
  args: {
    videoStorageId: v.id("_storage"),
    robot: v.union(v.literal("alpha"), v.literal("beta")),
    flywheelRpm: v.number(),
    hoodAngle: v.number(),
    notes: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    mimeType: v.optional(v.string()),
    frameRate: v.optional(v.number()),
    duration: v.optional(v.number()),
    resolution: v.optional(v.string()),
    clipStart: v.optional(v.number()),
    clipEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!member) throw new Error("Member not found");

    const videoId = await ctx.db.insert("shootingVideos", {
      videoStorageId: args.videoStorageId,
      robot: args.robot,
      flywheelRpm: args.flywheelRpm,
      hoodAngle: args.hoodAngle,
      notes: args.notes,
      uploadedBy: member._id,
      uploadedAt: Date.now(),
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      frameRate: args.frameRate,
      duration: args.duration,
      resolution: args.resolution,
      clipStart: args.clipStart,
      clipEnd: args.clipEnd,
    });

    // Automatically create a processing job for trajectory detection
    await ctx.db.insert("processingJobs", {
      videoId,
      type: "trajectory_detection",
      status: "pending",
      createdAt: Date.now(),
      retryCount: 0,
    });

    return videoId;
  },
});

export const listVideos = query({
  args: {
    robot: v.optional(v.union(v.literal("alpha"), v.literal("beta"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let videosQuery;
    if (args.robot) {
      videosQuery = ctx.db
        .query("shootingVideos")
        .withIndex("by_robot", (q) => q.eq("robot", args.robot!));
    } else {
      videosQuery = ctx.db
        .query("shootingVideos")
        .withIndex("by_uploaded_at");
    }

    const videos = await videosQuery.order("desc").collect();

    // Fetch uploader names and video URLs
    const videosWithDetails = await Promise.all(
      videos.map(async (video) => {
        const uploader = await ctx.db.get(video.uploadedBy);
        const videoUrl = await ctx.storage.getUrl(video.videoStorageId);
        return {
          ...video,
          uploaderName: uploader?.name ?? "Unknown",
          videoUrl,
        };
      })
    );

    return videosWithDetails;
  },
});

export const deleteVideo = mutation({
  args: {
    videoId: v.id("shootingVideos"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!member) throw new Error("Member not found");

    const video = await ctx.db.get(args.videoId);
    if (!video) throw new Error("Video not found");

    // Only allow deletion by uploader or admin/lead
    const canDelete =
      video.uploadedBy === member._id ||
      member.role === "admin" ||
      member.role === "lead";

    if (!canDelete) {
      throw new Error("Not authorized to delete this video");
    }

    // Delete the video file from storage
    await ctx.storage.delete(video.videoStorageId);
    if (video.thumbnailStorageId) {
      await ctx.storage.delete(video.thumbnailStorageId);
    }

    // Delete the record
    await ctx.db.delete(args.videoId);
  },
});

// ============================================
// INTERNAL FUNCTIONS (for debugging/admin)
// ============================================

/**
 * List all videos with their processing status (no auth required)
 */
export const listAllVideosInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const videos = await ctx.db.query("shootingVideos").collect();

    const videosWithJobs = await Promise.all(
      videos.map(async (video) => {
        // Get the most recent job for this video
        const job = await ctx.db
          .query("processingJobs")
          .withIndex("by_video", (q) => q.eq("videoId", video._id))
          .order("desc")
          .first();

        return {
          _id: video._id,
          robot: video.robot,
          flywheelRpm: video.flywheelRpm,
          hoodAngle: video.hoodAngle,
          uploadedAt: video.uploadedAt,
          hasJob: !!job,
          jobStatus: job?.status,
          jobId: job?._id,
        };
      })
    );

    return videosWithJobs;
  },
});

/**
 * Create processing jobs for videos that don't have one
 */
export const createMissingJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const videos = await ctx.db.query("shootingVideos").collect();
    let created = 0;

    for (const video of videos) {
      // Check if there's any job for this video
      const existingJob = await ctx.db
        .query("processingJobs")
        .withIndex("by_video", (q) => q.eq("videoId", video._id))
        .first();

      if (!existingJob) {
        await ctx.db.insert("processingJobs", {
          videoId: video._id,
          type: "trajectory_detection",
          status: "pending",
          createdAt: Date.now(),
          retryCount: 0,
        });
        created++;
      }
    }

    return { videosChecked: videos.length, jobsCreated: created };
  },
});
