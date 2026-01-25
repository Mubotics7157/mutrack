import {
  query,
  mutation,
  action,
  internalQuery,
  internalMutation,
  internalAction,
} from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  computeMeetingStartUtcMs,
  computeMeetingTimezoneOffsetMs,
} from "./lib/meetingTime";

// Token generation utilities
function generateToken(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const randomValues = new Uint8Array(12);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < 12; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function computeMeetingEndUtcMs(dateMs: number, endTime: string): number {
  const [hoursPart, minutesPart] = endTime.split(":");
  const hours = Number.parseInt(hoursPart ?? "", 10);
  const minutes = Number.parseInt(minutesPart ?? "", 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    throw new Error(`Invalid endTime format: ${endTime}`);
  }
  const date = new Date(dateMs);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const timezoneOffsetMs = computeMeetingTimezoneOffsetMs(dateMs);
  return Date.UTC(year, month, day, hours, minutes) + timezoneOffsetMs;
}

// Internal query to find members without beacons who have phone numbers
export const getMembersWithoutBeacons = internalQuery({
  args: {},
  handler: async (ctx) => {
    const members = await ctx.db.query("members").collect();

    const membersWithoutBeacons = [];
    for (const member of members) {
      // Check if member has a phone number and hasn't opted out of SMS
      if (!member.phoneNumber) continue;
      if (member.smsCheckInEnabled === false) continue;

      // Check if member has any beacons
      const beacon = await ctx.db
        .query("beacons")
        .withIndex("by_owner", (q) => q.eq("ownerMemberId", member._id))
        .first();

      if (!beacon) {
        membersWithoutBeacons.push(member);
      }
    }

    return membersWithoutBeacons;
  },
});

// Internal query to get token by hash
export const getTokenByHash = internalQuery({
  args: { tokenHash: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("smsCheckInTokens")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", args.tokenHash))
      .unique();
  },
});

// Internal query to get tokens for a meeting that need reminders
export const getTokensNeedingReminder = internalQuery({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const tokens = await ctx.db
      .query("smsCheckInTokens")
      .withIndex("by_meeting", (q) => q.eq("meetingId", args.meetingId))
      .collect();

    // Return tokens that are checked in but not checked out, and haven't had reminder sent
    return tokens.filter(
      (t) =>
        t.usedForCheckIn === true &&
        !t.checkOutTime &&
        !t.reminderSent &&
        !t.sessionInvalidated
    );
  },
});

// Internal query to get tokens for invalidation
export const getTokensForInvalidation = internalQuery({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const tokens = await ctx.db
      .query("smsCheckInTokens")
      .withIndex("by_meeting", (q) => q.eq("meetingId", args.meetingId))
      .collect();

    // Return tokens that are checked in but not checked out
    return tokens.filter(
      (t) =>
        t.usedForCheckIn === true && !t.checkOutTime && !t.sessionInvalidated
    );
  },
});

// Public query to get check-in page data (no auth required, token-based)
export const getCheckInPageData = query({
  args: { tokenHash: v.string() },
  handler: async (ctx, args) => {
    const token = await ctx.db
      .query("smsCheckInTokens")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", args.tokenHash))
      .unique();

    if (!token) {
      return { error: "invalid_token" as const };
    }

    const now = Date.now();
    if (now > token.expiresAt) {
      return { error: "expired_token" as const };
    }

    if (token.sessionInvalidated) {
      return { error: "session_invalidated" as const };
    }

    const member = await ctx.db.get(token.memberId);
    const meeting = await ctx.db.get(token.meetingId);

    if (!member || !meeting) {
      return { error: "not_found" as const };
    }

    return {
      memberName: member.firstName || member.name,
      meetingTitle: meeting.title,
      meetingDate: meeting.date,
      meetingStartTime: meeting.startTime,
      meetingEndTime: meeting.endTime,
      meetingLocation: meeting.location,
      isCheckedIn: token.usedForCheckIn === true,
      checkInTime: token.checkInTime,
      isCheckedOut: !!token.checkOutTime,
      checkOutTime: token.checkOutTime,
    };
  },
});

// Internal mutation to create check-in token
export const createCheckInToken = internalMutation({
  args: {
    memberId: v.id("members"),
    meetingId: v.id("meetings"),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if token already exists for this member/meeting
    const existing = await ctx.db
      .query("smsCheckInTokens")
      .withIndex("by_member_meeting", (q) =>
        q.eq("memberId", args.memberId).eq("meetingId", args.meetingId)
      )
      .unique();

    if (existing) {
      return { tokenId: existing._id, token: existing.token };
    }

    const token = generateToken();
    const tokenHashValue = await hashToken(token);

    const tokenId = await ctx.db.insert("smsCheckInTokens", {
      memberId: args.memberId,
      meetingId: args.meetingId,
      token,
      tokenHash: tokenHashValue,
      createdAt: Date.now(),
      expiresAt: args.expiresAt,
    });

    return { tokenId, token };
  },
});

// Internal mutation to perform check-in
export const performSmsCheckIn = internalMutation({
  args: { tokenHash: v.string() },
  handler: async (ctx, args) => {
    const token = await ctx.db
      .query("smsCheckInTokens")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", args.tokenHash))
      .unique();

    if (!token) {
      return { success: false, error: "invalid_token" as const };
    }

    const now = Date.now();
    if (now > token.expiresAt) {
      return { success: false, error: "expired_token" as const };
    }

    if (token.sessionInvalidated) {
      return { success: false, error: "session_invalidated" as const };
    }

    if (token.usedForCheckIn) {
      return { success: false, error: "already_checked_in" as const };
    }

    // Create attendance session
    const sessionId = await ctx.db.insert("attendanceSessions", {
      meetingId: token.meetingId,
      memberId: token.memberId,
      startTime: now,
      lastSeenAt: now,
      endTime: null,
      isSmsCheckIn: true,
      smsTokenId: token._id,
    });

    // Update token
    await ctx.db.patch(token._id, {
      usedForCheckIn: true,
      checkInTime: now,
    });

    return { success: true, sessionId };
  },
});

// Internal mutation to perform check-out
export const performSmsCheckOut = internalMutation({
  args: { tokenHash: v.string() },
  handler: async (ctx, args) => {
    const token = await ctx.db
      .query("smsCheckInTokens")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", args.tokenHash))
      .unique();

    if (!token) {
      return { success: false, error: "invalid_token" as const };
    }

    if (token.sessionInvalidated) {
      return { success: false, error: "session_invalidated" as const };
    }

    if (!token.usedForCheckIn) {
      return { success: false, error: "not_checked_in" as const };
    }

    if (token.checkOutTime) {
      return { success: false, error: "already_checked_out" as const };
    }

    const now = Date.now();

    // Find and close the attendance session
    const sessions = await ctx.db
      .query("attendanceSessions")
      .withIndex("by_meeting_and_member", (q) =>
        q.eq("meetingId", token.meetingId).eq("memberId", token.memberId)
      )
      .collect();

    const activeSession = sessions.find(
      (s) => s.endTime === null && s.isSmsCheckIn === true
    );

    if (activeSession) {
      await ctx.db.patch(activeSession._id, {
        endTime: now,
        lastSeenAt: now,
      });
    }

    // Update token
    await ctx.db.patch(token._id, {
      checkOutTime: now,
    });

    return { success: true };
  },
});

// Internal mutation to mark reminder sent
export const markReminderSent = internalMutation({
  args: { tokenId: v.id("smsCheckInTokens") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.tokenId, { reminderSent: true });
  },
});

// Internal mutation to invalidate sessions without checkout
export const invalidateUnfinishedSessions = internalMutation({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const tokens = await ctx.db
      .query("smsCheckInTokens")
      .withIndex("by_meeting", (q) => q.eq("meetingId", args.meetingId))
      .collect();

    let invalidatedCount = 0;
    for (const token of tokens) {
      if (token.usedForCheckIn && !token.checkOutTime && !token.sessionInvalidated) {
        // Mark token as invalidated
        await ctx.db.patch(token._id, { sessionInvalidated: true });

        // Delete the attendance session (zero hours)
        const sessions = await ctx.db
          .query("attendanceSessions")
          .withIndex("by_meeting_and_member", (q) =>
            q.eq("meetingId", token.meetingId).eq("memberId", token.memberId)
          )
          .collect();

        for (const session of sessions) {
          if (session.isSmsCheckIn && session.smsTokenId === token._id) {
            await ctx.db.delete(session._id);
          }
        }

        invalidatedCount++;
      }
    }

    return invalidatedCount;
  },
});

// Internal action to send check-in SMS via Twilio
export const sendCheckInSms = internalAction({
  args: {
    phoneNumber: v.string(),
    memberName: v.string(),
    meetingTitle: v.string(),
    meetingStartTime: v.string(),
    checkInUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

    if (!accountSid || !authToken || !messagingServiceSid) {
      console.error("Twilio credentials not configured");
      return { success: false, error: "Twilio not configured" };
    }

    const message = `Hi ${args.memberName}! Meeting "${args.meetingTitle}" starts at ${args.meetingStartTime}.

Check in here: ${args.checkInUrl}

IMPORTANT: You must check out when you leave or your hours won't count!`;

    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization:
              "Basic " +
              Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: args.phoneNumber,
            MessagingServiceSid: messagingServiceSid,
            Body: message,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Twilio error:", errorText);
        return { success: false, error: errorText };
      }

      return { success: true };
    } catch (error) {
      console.error("Failed to send SMS:", error);
      return { success: false, error: String(error) };
    }
  },
});

// Internal action to send checkout reminder SMS
export const sendCheckoutReminderSms = internalAction({
  args: {
    phoneNumber: v.string(),
    memberName: v.string(),
    meetingTitle: v.string(),
    checkInUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

    if (!accountSid || !authToken || !messagingServiceSid) {
      console.error("Twilio credentials not configured");
      return { success: false, error: "Twilio not configured" };
    }

    const message = `Reminder: "${args.meetingTitle}" ends in 10 minutes.

Don't forget to check out: ${args.checkInUrl}

If you don't check out, your attendance hours won't be counted!`;

    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization:
              "Basic " +
              Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: args.phoneNumber,
            MessagingServiceSid: messagingServiceSid,
            Body: message,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Twilio error:", errorText);
        return { success: false, error: errorText };
      }

      return { success: true };
    } catch (error) {
      console.error("Failed to send SMS:", error);
      return { success: false, error: String(error) };
    }
  },
});

// Internal action to schedule SMS for a meeting
export const scheduleSmsForMeeting = internalAction({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const meeting = await ctx.runQuery(api.meetings.getMeetingById, {
      meetingId: args.meetingId,
    });

    if (!meeting) {
      console.error("Meeting not found:", args.meetingId);
      return;
    }

    const meetingStartMs = computeMeetingStartUtcMs(
      meeting.date,
      meeting.startTime
    );
    const meetingEndMs = computeMeetingEndUtcMs(meeting.date, meeting.endTime);
    const now = Date.now();

    // Schedule check-in SMS 15 minutes before meeting
    const checkInTime = meetingStartMs - 15 * 60 * 1000;
    if (checkInTime > now) {
      await ctx.scheduler.runAt(
        checkInTime,
        internal.smsCheckIn.sendMeetingCheckInSms,
        { meetingId: args.meetingId }
      );
    }

    // Schedule checkout reminder 10 minutes before meeting ends
    const reminderTime = meetingEndMs - 10 * 60 * 1000;
    if (reminderTime > now) {
      await ctx.scheduler.runAt(
        reminderTime,
        internal.smsCheckIn.sendCheckoutReminders,
        { meetingId: args.meetingId }
      );
    }

    // Schedule session invalidation 15 minutes after meeting ends
    const invalidationTime = meetingEndMs + 15 * 60 * 1000;
    if (invalidationTime > now) {
      await ctx.scheduler.runAt(
        invalidationTime,
        internal.smsCheckIn.runInvalidateUnfinishedSessions,
        { meetingId: args.meetingId }
      );
    }
  },
});

// Internal action to send check-in SMS to all eligible members
export const sendMeetingCheckInSms = internalAction({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const meeting = await ctx.runQuery(api.meetings.getMeetingById, {
      meetingId: args.meetingId,
    });

    if (!meeting) {
      console.error("Meeting not found:", args.meetingId);
      return;
    }

    const siteUrl = process.env.SITE_URL || "https://mutrack.vercel.app";
    const meetingEndMs = computeMeetingEndUtcMs(meeting.date, meeting.endTime);
    const expiresAt = meetingEndMs + 30 * 60 * 1000; // 30 min after meeting ends

    const members = await ctx.runQuery(internal.smsCheckIn.getMembersWithoutBeacons, {});

    for (const member of members) {
      if (!member.phoneNumber) continue;

      // Create token
      const { token } = await ctx.runMutation(
        internal.smsCheckIn.createCheckInToken,
        {
          memberId: member._id,
          meetingId: args.meetingId,
          expiresAt,
        }
      );

      const checkInUrl = `${siteUrl}/checkin/${token}`;

      // Send SMS
      await ctx.runAction(internal.smsCheckIn.sendCheckInSms, {
        phoneNumber: member.phoneNumber,
        memberName: member.firstName || member.name,
        meetingTitle: meeting.title,
        meetingStartTime: meeting.startTime,
        checkInUrl,
      });
    }
  },
});

// Internal action to send checkout reminders
export const sendCheckoutReminders = internalAction({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const meeting = await ctx.runQuery(api.meetings.getMeetingById, {
      meetingId: args.meetingId,
    });

    if (!meeting) {
      console.error("Meeting not found:", args.meetingId);
      return;
    }

    const siteUrl = process.env.SITE_URL || "https://mutrack.vercel.app";

    const tokens = await ctx.runQuery(
      internal.smsCheckIn.getTokensNeedingReminder,
      { meetingId: args.meetingId }
    );

    for (const token of tokens) {
      const member = await ctx.runQuery(internal.smsCheckIn.getMemberById, {
        memberId: token.memberId,
      });

      if (!member?.phoneNumber) continue;

      const checkInUrl = `${siteUrl}/checkin/${token.token}`;

      // Send reminder
      await ctx.runAction(internal.smsCheckIn.sendCheckoutReminderSms, {
        phoneNumber: member.phoneNumber,
        memberName: member.firstName || member.name,
        meetingTitle: meeting.title,
        checkInUrl,
      });

      // Mark reminder as sent
      await ctx.runMutation(internal.smsCheckIn.markReminderSent, {
        tokenId: token._id,
      });
    }
  },
});

// Internal query to get member by ID (for actions)
export const getMemberById = internalQuery({
  args: { memberId: v.id("members") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.memberId);
  },
});

// Internal query to get meeting by ID (for HTTP actions)
export const getMeetingById = internalQuery({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.meetingId);
  },
});

// Internal action wrapper for invalidation (actions can schedule mutations)
export const runInvalidateUnfinishedSessions = internalAction({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const count = await ctx.runMutation(
      internal.smsCheckIn.invalidateUnfinishedSessions,
      { meetingId: args.meetingId }
    );
    console.log(`Invalidated ${count} unfinished SMS check-in sessions for meeting ${args.meetingId}`);
  },
});
