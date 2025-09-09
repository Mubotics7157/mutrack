"use node";
import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
// web-push has no types in this project; import via require style to satisfy TS
// eslint-disable-next-line @typescript-eslint/no-var-requires
const webpush = require("web-push");

function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const contact = process.env.VAPID_CONTACT || "mailto:admin@example.com";
  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys are not configured");
  }
  webpush.setVapidDetails(contact, publicKey, privateKey);
}

export const sendNotificationToAllEnabled = internalAction({
  args: {
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    configureWebPush();
    const enabledMembers = await ctx.runQuery(
      internal.members.listEnabledMembersQuery,
      {}
    );
    for (const member of enabledMembers) {
      const subs = await ctx.runQuery(
        internal.members.internalListSubscriptionsForMember,
        { memberId: member._id }
      );
      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys as any },
            JSON.stringify({
              title: args.title,
              body: args.body,
              url: args.url,
            })
          );
        } catch (e) {
          // Best-effort; ignore errors from invalid/stale subs
        }
      }
    }
    return null;
  },
});

import { internal, api } from "./_generated/api";

export const sendMeetingCreatedNotification = internalAction({
  args: {
    meetingId: v.id("meetings"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    configureWebPush();
    const meeting = await ctx.runQuery(api.meetings.getMeetingById, {
      meetingId: args.meetingId,
    });
    if (!meeting) return null;

    const title = `New meeting scheduled: ${meeting.title}`;
    const date = new Date(meeting.date).toLocaleDateString();
    const body = `${date} ${meeting.startTime} at ${meeting.location || "TBD"}`;
    await ctx.runAction(internal.notifications.sendNotificationToAllEnabled, {
      title,
      body,
      url: "/",
    });
    return null;
  },
});

export const sendMeetingReminderNotification = internalAction({
  args: {
    meetingId: v.id("meetings"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    configureWebPush();
    const meeting = await ctx.runQuery(api.meetings.getMeetingById, {
      meetingId: args.meetingId,
    });
    if (!meeting) return null;

    const title = `Reminder: ${meeting.title} in 3 hours`;
    const date = new Date(meeting.date).toLocaleDateString();
    const body = `${date} ${meeting.startTime} at ${meeting.location || "TBD"}`;
    await ctx.runAction(internal.notifications.sendNotificationToAllEnabled, {
      title,
      body,
      url: "/",
    });
    return null;
  },
});
