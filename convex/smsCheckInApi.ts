import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Hash token for secure lookup
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// GET /api/sms-checkin/status?token=xxx
export const handleSmsCheckInStatus = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response(JSON.stringify({ error: "missing_token" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const tokenHash = await hashToken(token);
  const tokenData = await ctx.runQuery(internal.smsCheckIn.getTokenByHash, {
    tokenHash,
  });

  if (!tokenData) {
    return new Response(JSON.stringify({ error: "invalid_token" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const now = Date.now();
  if (now > tokenData.expiresAt) {
    return new Response(JSON.stringify({ error: "expired_token" }), {
      status: 410,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (tokenData.sessionInvalidated) {
    return new Response(JSON.stringify({ error: "session_invalidated" }), {
      status: 410,
      headers: { "Content-Type": "application/json" },
    });
  }

  const member = await ctx.runQuery(internal.smsCheckIn.getMemberById, {
    memberId: tokenData.memberId,
  });

  // We need to get meeting data - let's use internal query
  const meeting = await ctx.runQuery(internal.smsCheckIn.getMeetingById, {
    meetingId: tokenData.meetingId,
  });

  if (!member || !meeting) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      memberName: member.firstName || member.name,
      meetingTitle: meeting.title,
      meetingDate: meeting.date,
      meetingStartTime: meeting.startTime,
      meetingEndTime: meeting.endTime,
      meetingLocation: meeting.location,
      isCheckedIn: tokenData.usedForCheckIn === true,
      checkInTime: tokenData.checkInTime,
      isCheckedOut: !!tokenData.checkOutTime,
      checkOutTime: tokenData.checkOutTime,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
});

// POST /api/sms-checkin/checkin
export const handleSmsCheckIn = httpAction(async (ctx, request) => {
  try {
    const body = await request.json();
    const token = body.token;

    if (!token) {
      return new Response(JSON.stringify({ error: "missing_token" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const tokenHash = await hashToken(token);
    const result = await ctx.runMutation(internal.smsCheckIn.performSmsCheckIn, {
      tokenHash,
    });

    if (!result.success) {
      const statusCode =
        result.error === "invalid_token"
          ? 404
          : result.error === "expired_token" || result.error === "session_invalidated"
            ? 410
            : 400;

      return new Response(JSON.stringify({ error: result.error }), {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Check-in error:", error);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// POST /api/sms-checkin/checkout
export const handleSmsCheckOut = httpAction(async (ctx, request) => {
  try {
    const body = await request.json();
    const token = body.token;

    if (!token) {
      return new Response(JSON.stringify({ error: "missing_token" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const tokenHash = await hashToken(token);
    const result = await ctx.runMutation(internal.smsCheckIn.performSmsCheckOut, {
      tokenHash,
    });

    if (!result.success) {
      const statusCode =
        result.error === "invalid_token"
          ? 404
          : result.error === "session_invalidated"
            ? 410
            : 400;

      return new Response(JSON.stringify({ error: result.error }), {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Check-out error:", error);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
