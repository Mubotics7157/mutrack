import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// POST /api/scanner/beacon-sightings
// Body: { sightings: [{ uuid, major, minor, rssi? }] }
export const handleBeaconSightings = httpAction(async (ctx, request) => {
  // Validate API key from Authorization header
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing API key" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = authHeader.replace("Bearer ", "");
  const apiKeyHash = await hashApiKey(apiKey);

  const scanner = await ctx.runQuery(internal.scanners.validateApiKey, {
    apiKeyHash,
  });
  if (!scanner) {
    return new Response(
      JSON.stringify({ error: "Invalid or inactive scanner" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Parse request body
  let body: { sightings?: Array<{ uuid: string; major: number; minor: number; rssi?: number }> };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sightings = body.sightings;
  if (!Array.isArray(sightings)) {
    return new Response(
      JSON.stringify({ error: "sightings must be an array" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Find active meetings
  const activeMeetings = await ctx.runQuery(internal.meetings.getActiveMeetings, {});

  if (activeMeetings.length === 0) {
    // No active meetings, still update heartbeat and return success
    await ctx.runMutation(internal.scanners.updateHeartbeat, {
      scannerId: scanner._id,
    });
    return new Response(
      JSON.stringify({
        success: true,
        processed: 0,
        message: "No active meetings",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Process each sighting
  let processed = 0;
  for (const sighting of sightings) {
    if (
      typeof sighting.uuid !== "string" ||
      typeof sighting.major !== "number" ||
      typeof sighting.minor !== "number"
    ) {
      continue; // Skip invalid sightings
    }

    // Check if this beacon is paired to anyone
    const beaconKey = `ibeacon:${sighting.uuid.toLowerCase().trim()}:${sighting.major}:${sighting.minor}`;
    const memberId = await ctx.runQuery(internal.beacons.findMemberByBeaconKey, {
      key: beaconKey,
    });

    if (memberId) {
      // Known beacon - log attendance for active meetings
      for (const meeting of activeMeetings) {
        await ctx.runMutation(internal.attendance.handleDeviceBeaconSighting, {
          meetingId: meeting._id,
          uuid: sighting.uuid,
          major: sighting.major,
          minor: sighting.minor,
          scannerId: scanner._id,
        });
      }
    } else {
      // Unknown beacon - track it for admin to pair later
      await ctx.runMutation(internal.scanners.trackUnpairedBeacon, {
        uuid: sighting.uuid,
        major: sighting.major,
        minor: sighting.minor,
        scannerId: scanner._id,
      });
    }
    processed++;
  }

  // Update scanner heartbeat
  await ctx.runMutation(internal.scanners.updateHeartbeat, {
    scannerId: scanner._id,
  });

  return new Response(
    JSON.stringify({
      success: true,
      processed,
      activeMeetings: activeMeetings.length,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
});

// POST /api/scanner/heartbeat
// Body: { metadata?: { platform?, version?, hostname? } }
export const handleHeartbeat = httpAction(async (ctx, request) => {
  // Validate API key
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing API key" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = authHeader.replace("Bearer ", "");
  const apiKeyHash = await hashApiKey(apiKey);

  const scanner = await ctx.runQuery(internal.scanners.validateApiKey, {
    apiKeyHash,
  });
  if (!scanner) {
    return new Response(
      JSON.stringify({ error: "Invalid or inactive scanner" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Parse optional metadata
  let metadata: { platform?: string; version?: string; hostname?: string } | undefined;
  try {
    const body = await request.json();
    if (body.metadata && typeof body.metadata === "object") {
      metadata = {
        platform: body.metadata.platform,
        version: body.metadata.version,
        hostname: body.metadata.hostname,
      };
    }
  } catch {
    // No body or invalid JSON is fine for heartbeat
  }

  await ctx.runMutation(internal.scanners.updateHeartbeat, {
    scannerId: scanner._id,
    metadata,
  });

  return new Response(
    JSON.stringify({
      success: true,
      scanner: scanner.name,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
});
