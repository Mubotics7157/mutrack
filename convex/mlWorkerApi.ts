import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Validate ML worker API key and return worker info
 */
async function validateWorker(
  ctx: any,
  request: Request
): Promise<{ workerId: Id<"mlWorkers">; name: string } | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const apiKey = authHeader.replace("Bearer ", "");
  const apiKeyHash = await hashApiKey(apiKey);

  const worker = await ctx.runQuery(internal.mlWorkers.validateApiKey, {
    apiKeyHash,
  });

  return worker;
}

function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ============================================
// POST /api/ml/jobs/claim
// Claim a pending job for processing
// Body: { jobTypes?: ["trajectory_detection", "parameter_fitting"] }
// ============================================
export const handleClaimJob = httpAction(async (ctx, request) => {
  const worker = await validateWorker(ctx, request);
  if (!worker) {
    return jsonResponse({ error: "Invalid or missing API key" }, 401);
  }

  // Parse request body for job type preferences
  let jobTypes: Array<"trajectory_detection" | "parameter_fitting"> = [
    "trajectory_detection",
    "parameter_fitting",
  ];

  try {
    const body = await request.json();
    if (Array.isArray(body.jobTypes) && body.jobTypes.length > 0) {
      jobTypes = body.jobTypes.filter(
        (t: string) =>
          t === "trajectory_detection" || t === "parameter_fitting"
      );
    }
  } catch {
    // Use default job types
  }

  // Try to claim a job
  const job = await ctx.runMutation(internal.mlJobs.claimJob, {
    workerId: worker.workerId,
    jobTypes,
  });

  if (!job) {
    return jsonResponse({ job: null, message: "No pending jobs" }, 200);
  }

  // Update worker heartbeat
  await ctx.runMutation(internal.mlWorkers.updateHeartbeat, {
    workerId: worker.workerId,
    currentJobId: job.jobId,
  });

  return jsonResponse({ job }, 200);
});

// ============================================
// POST /api/ml/jobs/progress
// Update job progress
// Body: { jobId, progress, progressMessage? }
// ============================================
export const handleUpdateProgress = httpAction(async (ctx, request) => {
  const worker = await validateWorker(ctx, request);
  if (!worker) {
    return jsonResponse({ error: "Invalid or missing API key" }, 401);
  }

  let body: { jobId?: string; progress?: number; progressMessage?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (!body.jobId || typeof body.progress !== "number") {
    return jsonResponse(
      { error: "Missing required fields: jobId, progress" },
      400
    );
  }

  const result = await ctx.runMutation(internal.mlJobs.updateProgress, {
    jobId: body.jobId as any,
    workerId: worker.workerId,
    progress: Math.min(100, Math.max(0, body.progress)),
    progressMessage: body.progressMessage,
  });

  if (!result.success) {
    return jsonResponse({ error: result.error }, 400);
  }

  return jsonResponse({ success: true }, 200);
});

// ============================================
// POST /api/ml/jobs/complete
// Mark job as completed with results
// Body: { jobId, trajectory: {...} }
// ============================================
export const handleCompleteJob = httpAction(async (ctx, request) => {
  const worker = await validateWorker(ctx, request);
  if (!worker) {
    return jsonResponse({ error: "Invalid or missing API key" }, 401);
  }

  let body: {
    jobId?: string;
    trajectory?: {
      positions: string;
      frameCount: number;
      detectedFrameCount: number;
      averageConfidence: number;
      launchAngle?: number;
      launchSpeed?: number;
      maxHeight?: number;
      horizontalDistance?: number;
      flightTime?: number;
      isValid: boolean;
      qualityScore?: number;
      qualityNotes?: string;
    };
  };

  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (!body.jobId || !body.trajectory) {
    return jsonResponse(
      { error: "Missing required fields: jobId, trajectory" },
      400
    );
  }

  // Validate trajectory structure
  const t = body.trajectory;
  if (
    typeof t.positions !== "string" ||
    typeof t.frameCount !== "number" ||
    typeof t.detectedFrameCount !== "number" ||
    typeof t.averageConfidence !== "number" ||
    typeof t.isValid !== "boolean"
  ) {
    return jsonResponse(
      {
        error:
          "Invalid trajectory: requires positions, frameCount, detectedFrameCount, averageConfidence, isValid",
      },
      400
    );
  }

  // Convert null to undefined for optional fields (Convex validators don't accept null)
  const result = await ctx.runMutation(internal.mlJobs.completeJob, {
    jobId: body.jobId as any,
    workerId: worker.workerId,
    trajectory: {
      positions: t.positions,
      frameCount: t.frameCount,
      detectedFrameCount: t.detectedFrameCount,
      averageConfidence: t.averageConfidence,
      launchAngle: t.launchAngle ?? undefined,
      launchSpeed: t.launchSpeed ?? undefined,
      maxHeight: t.maxHeight ?? undefined,
      horizontalDistance: t.horizontalDistance ?? undefined,
      flightTime: t.flightTime ?? undefined,
      isValid: t.isValid,
      qualityScore: t.qualityScore ?? undefined,
      qualityNotes: t.qualityNotes ?? undefined,
    },
  });

  // Clear worker's current job
  await ctx.runMutation(internal.mlWorkers.updateHeartbeat, {
    workerId: worker.workerId,
    currentJobId: undefined,
    incrementCompletedCount: true,
  });

  if (!result.success) {
    return jsonResponse({ error: result.error }, 400);
  }

  return jsonResponse(
    { success: true, trajectoryId: result.trajectoryId },
    200
  );
});

// ============================================
// POST /api/ml/jobs/fail
// Mark job as failed
// Body: { jobId, errorMessage }
// ============================================
export const handleFailJob = httpAction(async (ctx, request) => {
  const worker = await validateWorker(ctx, request);
  if (!worker) {
    return jsonResponse({ error: "Invalid or missing API key" }, 401);
  }

  let body: { jobId?: string; errorMessage?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (!body.jobId || !body.errorMessage) {
    return jsonResponse(
      { error: "Missing required fields: jobId, errorMessage" },
      400
    );
  }

  const result = await ctx.runMutation(internal.mlJobs.failJob, {
    jobId: body.jobId as any,
    workerId: worker.workerId,
    errorMessage: body.errorMessage,
  });

  // Clear worker's current job
  await ctx.runMutation(internal.mlWorkers.updateHeartbeat, {
    workerId: worker.workerId,
    currentJobId: undefined,
  });

  if (!result.success) {
    return jsonResponse({ error: result.error }, 400);
  }

  return jsonResponse({ success: true }, 200);
});

// ============================================
// POST /api/ml/heartbeat
// Worker heartbeat with optional metadata
// Body: { metadata?: { gpuModel?, platform?, version? } }
// ============================================
export const handleWorkerHeartbeat = httpAction(async (ctx, request) => {
  const worker = await validateWorker(ctx, request);
  if (!worker) {
    return jsonResponse({ error: "Invalid or missing API key" }, 401);
  }

  let metadata:
    | { gpuModel?: string; platform?: string; version?: string }
    | undefined;

  try {
    const body = await request.json();
    if (body.metadata && typeof body.metadata === "object") {
      metadata = {
        gpuModel: body.metadata.gpuModel,
        platform: body.metadata.platform,
        version: body.metadata.version,
      };
    }
  } catch {
    // No body is fine for heartbeat
  }

  await ctx.runMutation(internal.mlWorkers.updateHeartbeat, {
    workerId: worker.workerId,
    metadata,
  });

  // Get pending job count for worker to adjust polling
  const pendingCount = await ctx.runQuery(internal.mlJobs.getPendingJobCount, {});

  return jsonResponse({
    success: true,
    worker: worker.name,
    pendingJobCount: pendingCount,
  }, 200);
});

// ============================================
// POST /api/ml/calibrate
// Process camera calibration images
// Body: FormData with images
// ============================================
export const handleCalibrationUpload = httpAction(async (ctx, request) => {
  const worker = await validateWorker(ctx, request);
  if (!worker) {
    return jsonResponse({ error: "Invalid or missing API key" }, 401);
  }

  // This endpoint receives calibration results from Python
  // The actual image processing happens in Python backend
  let body: {
    deviceId: string;
    deviceName?: string;
    fx: number;
    fy: number;
    cx: number;
    cy: number;
    distortionCoeffs: number[];
    imageWidth: number;
    imageHeight: number;
    reprojectionError?: number;
    memberId: string;
  };

  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  // Validate required fields
  if (
    !body.deviceId ||
    typeof body.fx !== "number" ||
    typeof body.fy !== "number" ||
    typeof body.cx !== "number" ||
    typeof body.cy !== "number" ||
    !Array.isArray(body.distortionCoeffs) ||
    typeof body.imageWidth !== "number" ||
    typeof body.imageHeight !== "number" ||
    !body.memberId
  ) {
    return jsonResponse(
      { error: "Missing required calibration fields" },
      400
    );
  }

  const calibrationId = await ctx.runMutation(
    internal.calibration.createCalibration,
    {
      deviceId: body.deviceId,
      deviceName: body.deviceName,
      fx: body.fx,
      fy: body.fy,
      cx: body.cx,
      cy: body.cy,
      distortionCoeffs: body.distortionCoeffs,
      imageWidth: body.imageWidth,
      imageHeight: body.imageHeight,
      reprojectionError: body.reprojectionError,
      calibratedBy: body.memberId as any,
    }
  );

  return jsonResponse({ success: true, calibrationId }, 200);
});
