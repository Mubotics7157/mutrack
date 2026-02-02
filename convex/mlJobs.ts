import {
  query,
  mutation,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// ============================================
// PUBLIC QUERIES & MUTATIONS (for frontend)
// ============================================

/**
 * Create a new processing job for a video
 */
export const createJob = mutation({
  args: {
    videoId: v.id("shootingVideos"),
    type: v.union(
      v.literal("trajectory_detection"),
      v.literal("parameter_fitting")
    ),
    calibrationId: v.optional(v.id("cameraCalibrations")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!member) throw new Error("Member not found");

    // Verify video exists
    const video = await ctx.db.get(args.videoId);
    if (!video) throw new Error("Video not found");

    // Check if there's already a pending/processing job for this video
    const existingJob = await ctx.db
      .query("processingJobs")
      .withIndex("by_video", (q) => q.eq("videoId", args.videoId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "processing")
        )
      )
      .first();

    if (existingJob) {
      throw new Error("A job is already pending or processing for this video");
    }

    const jobId = await ctx.db.insert("processingJobs", {
      videoId: args.videoId,
      type: args.type,
      status: "pending",
      createdAt: Date.now(),
      retryCount: 0,
      params: args.calibrationId
        ? { calibrationId: args.calibrationId }
        : undefined,
    });

    return jobId;
  },
});

/**
 * Get job status by ID
 */
export const getJobStatus = query({
  args: { jobId: v.id("processingJobs") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const job = await ctx.db.get(args.jobId);
    if (!job) return null;

    return {
      _id: job._id,
      videoId: job.videoId,
      type: job.type,
      status: job.status,
      progress: job.progress ?? 0,
      progressMessage: job.progressMessage,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      resultId: job.resultId,
      errorMessage: job.errorMessage,
    };
  },
});

/**
 * Get job status for a specific video
 */
export const getJobForVideo = query({
  args: { videoId: v.id("shootingVideos") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Get the most recent job for this video
    const job = await ctx.db
      .query("processingJobs")
      .withIndex("by_video", (q) => q.eq("videoId", args.videoId))
      .order("desc")
      .first();

    if (!job) return null;

    return {
      _id: job._id,
      videoId: job.videoId,
      type: job.type,
      status: job.status,
      progress: job.progress ?? 0,
      progressMessage: job.progressMessage,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      resultId: job.resultId,
      errorMessage: job.errorMessage,
    };
  },
});

/**
 * List all jobs (admin only)
 */
export const listJobs = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!member || member.role !== "admin") return [];

    let jobsQuery;
    if (args.status) {
      jobsQuery = ctx.db
        .query("processingJobs")
        .withIndex("by_status", (q) => q.eq("status", args.status!));
    } else {
      jobsQuery = ctx.db.query("processingJobs");
    }

    const limit = args.limit ?? 50;
    const jobs = await jobsQuery.order("desc").take(limit);

    return jobs.map((job) => ({
      _id: job._id,
      videoId: job.videoId,
      type: job.type,
      status: job.status,
      progress: job.progress ?? 0,
      progressMessage: job.progressMessage,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      workerId: job.workerId,
      errorMessage: job.errorMessage,
    }));
  },
});

/**
 * Cancel a pending job
 */
export const cancelJob = mutation({
  args: { jobId: v.id("processingJobs") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!member) throw new Error("Member not found");

    const job = await ctx.db.get(args.jobId);
    if (!job) throw new Error("Job not found");

    // Only allow canceling pending jobs
    if (job.status !== "pending") {
      throw new Error("Can only cancel pending jobs");
    }

    await ctx.db.patch(args.jobId, {
      status: "failed",
      errorMessage: "Cancelled by user",
      completedAt: Date.now(),
    });
  },
});

/**
 * Retry a failed job
 */
export const retryJob = mutation({
  args: { jobId: v.id("processingJobs") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!member) throw new Error("Member not found");

    const job = await ctx.db.get(args.jobId);
    if (!job) throw new Error("Job not found");

    if (job.status !== "failed") {
      throw new Error("Can only retry failed jobs");
    }

    await ctx.db.patch(args.jobId, {
      status: "pending",
      progress: undefined,
      progressMessage: undefined,
      startedAt: undefined,
      completedAt: undefined,
      workerId: undefined,
      errorMessage: undefined,
      retryCount: (job.retryCount ?? 0) + 1,
    });
  },
});

// ============================================
// INTERNAL QUERIES & MUTATIONS (for ML workers)
// ============================================

/**
 * Claim a pending job for processing
 * Called by ML workers via HTTP API
 */
export const claimJob = internalMutation({
  args: {
    workerId: v.string(),
    jobTypes: v.array(
      v.union(
        v.literal("trajectory_detection"),
        v.literal("parameter_fitting")
      )
    ),
  },
  handler: async (ctx, args) => {
    // Find oldest pending job matching worker capabilities
    const pendingJobs = await ctx.db
      .query("processingJobs")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    // Filter by job type and sort by creation time
    const eligibleJobs = pendingJobs
      .filter((job) => args.jobTypes.includes(job.type))
      .sort((a, b) => a.createdAt - b.createdAt);

    const job = eligibleJobs[0];
    if (!job) return null;

    // Claim the job
    await ctx.db.patch(job._id, {
      status: "processing",
      workerId: args.workerId,
      startedAt: Date.now(),
    });

    // Get video details
    const video = await ctx.db.get(job.videoId);
    if (!video) {
      // Video was deleted, fail the job
      await ctx.db.patch(job._id, {
        status: "failed",
        errorMessage: "Video not found",
        completedAt: Date.now(),
      });
      return null;
    }

    const videoUrl = await ctx.storage.getUrl(video.videoStorageId);

    // Get calibration if specified
    let calibration = null;
    if (job.params?.calibrationId) {
      calibration = await ctx.db.get(job.params.calibrationId);
    }

    return {
      jobId: job._id,
      videoId: job.videoId,
      type: job.type,
      videoUrl,
      video: {
        robot: video.robot,
        flywheelRpm: video.flywheelRpm,
        hoodAngle: video.hoodAngle,
        frameRate: video.frameRate,
        duration: video.duration,
        resolution: video.resolution,
        clipStart: video.clipStart,
        clipEnd: video.clipEnd,
      },
      calibration: calibration
        ? {
            fx: calibration.fx,
            fy: calibration.fy,
            cx: calibration.cx,
            cy: calibration.cy,
            distortionCoeffs: calibration.distortionCoeffs,
            imageWidth: calibration.imageWidth,
            imageHeight: calibration.imageHeight,
          }
        : null,
    };
  },
});

/**
 * Update job progress
 */
export const updateProgress = internalMutation({
  args: {
    jobId: v.id("processingJobs"),
    workerId: v.string(),
    progress: v.number(),
    progressMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return { success: false, error: "Job not found" };

    if (job.workerId !== args.workerId) {
      return { success: false, error: "Worker mismatch" };
    }

    if (job.status !== "processing") {
      return { success: false, error: "Job not in processing state" };
    }

    await ctx.db.patch(args.jobId, {
      progress: args.progress,
      progressMessage: args.progressMessage,
    });

    return { success: true };
  },
});

/**
 * Mark job as completed with results
 */
export const completeJob = internalMutation({
  args: {
    jobId: v.id("processingJobs"),
    workerId: v.string(),
    trajectory: v.object({
      positions: v.string(), // JSON array
      frameCount: v.number(),
      detectedFrameCount: v.number(),
      averageConfidence: v.number(),
      launchAngle: v.optional(v.number()),
      launchSpeed: v.optional(v.number()),
      maxHeight: v.optional(v.number()),
      horizontalDistance: v.optional(v.number()),
      flightTime: v.optional(v.number()),
      isValid: v.boolean(),
      qualityScore: v.optional(v.number()),
      qualityNotes: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return { success: false, error: "Job not found" };

    if (job.workerId !== args.workerId) {
      return { success: false, error: "Worker mismatch" };
    }

    if (job.status !== "processing") {
      return { success: false, error: "Job not in processing state" };
    }

    // Create trajectory record
    const trajectoryId = await ctx.db.insert("trajectories", {
      videoId: job.videoId,
      jobId: job._id,
      calibrationId: job.params?.calibrationId,
      positions: args.trajectory.positions,
      frameCount: args.trajectory.frameCount,
      detectedFrameCount: args.trajectory.detectedFrameCount,
      averageConfidence: args.trajectory.averageConfidence,
      launchAngle: args.trajectory.launchAngle,
      launchSpeed: args.trajectory.launchSpeed,
      maxHeight: args.trajectory.maxHeight,
      horizontalDistance: args.trajectory.horizontalDistance,
      flightTime: args.trajectory.flightTime,
      isValid: args.trajectory.isValid,
      qualityScore: args.trajectory.qualityScore,
      qualityNotes: args.trajectory.qualityNotes,
      createdAt: Date.now(),
    });

    // Update job status
    await ctx.db.patch(args.jobId, {
      status: "completed",
      progress: 100,
      progressMessage: "Complete",
      completedAt: Date.now(),
      resultId: trajectoryId,
    });

    return { success: true, trajectoryId };
  },
});

/**
 * Mark job as failed
 */
export const failJob = internalMutation({
  args: {
    jobId: v.id("processingJobs"),
    workerId: v.string(),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return { success: false, error: "Job not found" };

    if (job.workerId !== args.workerId) {
      return { success: false, error: "Worker mismatch" };
    }

    await ctx.db.patch(args.jobId, {
      status: "failed",
      errorMessage: args.errorMessage,
      completedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get pending job count (for workers to decide polling frequency)
 */
export const getPendingJobCount = internalQuery({
  args: {},
  handler: async (ctx) => {
    const pending = await ctx.db
      .query("processingJobs")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    return pending.length;
  },
});

/**
 * Internal retry function (no auth required)
 */
export const retryJobInternal = internalMutation({
  args: { jobId: v.id("processingJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new Error("Job not found");

    await ctx.db.patch(args.jobId, {
      status: "pending",
      progress: undefined,
      progressMessage: undefined,
      startedAt: undefined,
      completedAt: undefined,
      workerId: undefined,
      errorMessage: undefined,
      retryCount: (job.retryCount ?? 0) + 1,
    });

    return { success: true };
  },
});

/**
 * Get job details (internal, no auth)
 */
export const getJobInternal = internalQuery({
  args: { jobId: v.id("processingJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    return job;
  },
});

/**
 * Update job calibration and retry (internal, no auth)
 */
export const retryJobWithCalibration = internalMutation({
  args: {
    jobId: v.id("processingJobs"),
    calibrationId: v.id("cameraCalibrations"),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new Error("Job not found");

    // Delete old trajectory if exists
    if (job.resultId) {
      await ctx.db.delete(job.resultId);
    }

    // Update job with calibration and reset to pending
    await ctx.db.patch(args.jobId, {
      status: "pending",
      progress: undefined,
      progressMessage: undefined,
      startedAt: undefined,
      completedAt: undefined,
      workerId: undefined,
      errorMessage: undefined,
      resultId: undefined,
      retryCount: (job.retryCount ?? 0) + 1,
      params: { calibrationId: args.calibrationId },
    });

    return { success: true };
  },
});
