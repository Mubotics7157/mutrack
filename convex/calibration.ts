import {
  query,
  mutation,
  internalMutation,
} from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ============================================
// PUBLIC QUERIES & MUTATIONS (for frontend)
// ============================================

/**
 * Get calibration for a device
 */
export const getCalibrationForDevice = query({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Get the most recent calibration for this device
    const calibration = await ctx.db
      .query("cameraCalibrations")
      .withIndex("by_device", (q) => q.eq("deviceId", args.deviceId))
      .order("desc")
      .first();

    if (!calibration) return null;

    // Get calibrator name
    const calibrator = await ctx.db.get(calibration.calibratedBy);

    return {
      _id: calibration._id,
      deviceId: calibration.deviceId,
      deviceName: calibration.deviceName,
      fx: calibration.fx,
      fy: calibration.fy,
      cx: calibration.cx,
      cy: calibration.cy,
      distortionCoeffs: calibration.distortionCoeffs,
      imageWidth: calibration.imageWidth,
      imageHeight: calibration.imageHeight,
      reprojectionError: calibration.reprojectionError,
      calibratedBy: calibrator?.name ?? "Unknown",
      calibratedAt: calibration.calibratedAt,
    };
  },
});

/**
 * Get calibration by ID
 */
export const getCalibration = query({
  args: { calibrationId: v.id("cameraCalibrations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const calibration = await ctx.db.get(args.calibrationId);
    if (!calibration) return null;

    const calibrator = await ctx.db.get(calibration.calibratedBy);

    return {
      _id: calibration._id,
      deviceId: calibration.deviceId,
      deviceName: calibration.deviceName,
      fx: calibration.fx,
      fy: calibration.fy,
      cx: calibration.cx,
      cy: calibration.cy,
      distortionCoeffs: calibration.distortionCoeffs,
      imageWidth: calibration.imageWidth,
      imageHeight: calibration.imageHeight,
      reprojectionError: calibration.reprojectionError,
      calibratedBy: calibrator?.name ?? "Unknown",
      calibratedAt: calibration.calibratedAt,
    };
  },
});

/**
 * List all calibrations for the current user
 */
export const listMyCalibrations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!member) return [];

    const calibrations = await ctx.db
      .query("cameraCalibrations")
      .withIndex("by_member", (q) => q.eq("calibratedBy", member._id))
      .order("desc")
      .collect();

    return calibrations.map((c) => ({
      _id: c._id,
      deviceId: c.deviceId,
      deviceName: c.deviceName,
      imageWidth: c.imageWidth,
      imageHeight: c.imageHeight,
      reprojectionError: c.reprojectionError,
      calibratedAt: c.calibratedAt,
    }));
  },
});

/**
 * List all calibrations (for selection dropdown)
 */
export const listAllCalibrations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const calibrations = await ctx.db
      .query("cameraCalibrations")
      .order("desc")
      .take(100);

    const calibrationsWithNames = await Promise.all(
      calibrations.map(async (c) => {
        const calibrator = await ctx.db.get(c.calibratedBy);
        return {
          _id: c._id,
          deviceId: c.deviceId,
          deviceName: c.deviceName,
          imageWidth: c.imageWidth,
          imageHeight: c.imageHeight,
          reprojectionError: c.reprojectionError,
          calibratedBy: calibrator?.name ?? "Unknown",
          calibratedAt: c.calibratedAt,
        };
      })
    );

    return calibrationsWithNames;
  },
});

/**
 * Save a new camera calibration
 */
export const saveCalibration = mutation({
  args: {
    deviceId: v.string(),
    deviceName: v.optional(v.string()),
    fx: v.number(),
    fy: v.number(),
    cx: v.number(),
    cy: v.number(),
    distortionCoeffs: v.array(v.number()),
    imageWidth: v.number(),
    imageHeight: v.number(),
    reprojectionError: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!member) throw new Error("Member not found");

    const calibrationId = await ctx.db.insert("cameraCalibrations", {
      deviceId: args.deviceId,
      deviceName: args.deviceName,
      fx: args.fx,
      fy: args.fy,
      cx: args.cx,
      cy: args.cy,
      distortionCoeffs: args.distortionCoeffs,
      imageWidth: args.imageWidth,
      imageHeight: args.imageHeight,
      reprojectionError: args.reprojectionError,
      calibratedBy: member._id,
      calibratedAt: Date.now(),
    });

    return calibrationId;
  },
});

/**
 * Delete a calibration
 */
export const deleteCalibration = mutation({
  args: { calibrationId: v.id("cameraCalibrations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!member) throw new Error("Member not found");

    const calibration = await ctx.db.get(args.calibrationId);
    if (!calibration) throw new Error("Calibration not found");

    // Only allow deletion by owner or admin
    const canDelete =
      calibration.calibratedBy === member._id || member.role === "admin";

    if (!canDelete) {
      throw new Error("Not authorized to delete this calibration");
    }

    await ctx.db.delete(args.calibrationId);
  },
});

// ============================================
// INTERNAL MUTATION (for ML worker API)
// ============================================

/**
 * Create calibration from ML worker (used by calibration endpoint)
 */
export const createCalibration = internalMutation({
  args: {
    deviceId: v.string(),
    deviceName: v.optional(v.string()),
    fx: v.number(),
    fy: v.number(),
    cx: v.number(),
    cy: v.number(),
    distortionCoeffs: v.array(v.number()),
    imageWidth: v.number(),
    imageHeight: v.number(),
    reprojectionError: v.optional(v.number()),
    calibratedBy: v.id("members"),
  },
  handler: async (ctx, args) => {
    const calibrationId = await ctx.db.insert("cameraCalibrations", {
      deviceId: args.deviceId,
      deviceName: args.deviceName,
      fx: args.fx,
      fy: args.fy,
      cx: args.cx,
      cy: args.cy,
      distortionCoeffs: args.distortionCoeffs,
      imageWidth: args.imageWidth,
      imageHeight: args.imageHeight,
      reprojectionError: args.reprojectionError,
      calibratedBy: args.calibratedBy,
      calibratedAt: Date.now(),
    });

    return calibrationId;
  },
});
