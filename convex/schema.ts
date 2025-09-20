import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  members: defineTable({
    userId: v.id("users"),
    name: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    notificationsEnabled: v.optional(v.boolean()),
    onboardingCompleted: v.optional(v.boolean()),
    role: v.union(v.literal("admin"), v.literal("lead"), v.literal("member")),
    joinedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_notifications_enabled", ["notificationsEnabled"]),

  meetings: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    date: v.number(),
    startTime: v.string(), // "HH:MM" format
    endTime: v.string(), // "HH:MM" format
    location: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_date", ["date"]),

  meetingRsvps: defineTable({
    meetingId: v.id("meetings"),
    memberId: v.id("members"),
    status: v.union(v.literal("attending"), v.literal("not_attending")),
    updatedAt: v.number(),
  })
    .index("by_meeting", ["meetingId"])
    .index("by_member", ["memberId"])
    .index("by_meeting_and_member", ["meetingId", "memberId"]),

  beacons: defineTable({
    key: v.string(), // canonical beacon identifier (e.g., ibeacon:uuid:major:minor)
    type: v.union(
      v.literal("ibeacon"),
      v.literal("eddystone"),
      v.literal("other")
    ),
    label: v.optional(v.string()),
    ownerMemberId: v.id("members"),
    createdAt: v.number(),
  })
    .index("by_key", ["key"]) // unique key per physical beacon
    .index("by_owner", ["ownerMemberId"]),

  attendanceSessions: defineTable({
    meetingId: v.id("meetings"),
    memberId: v.id("members"),
    startTime: v.number(),
    lastSeenAt: v.number(),
    endTime: v.union(v.null(), v.number()), // null while active, number when ended
    scannerMemberId: v.id("members"), // admin/lead operating the scanner
  })
    .index("by_meeting", ["meetingId"])
    .index("by_member", ["memberId"])
    .index("by_meeting_and_member", ["meetingId", "memberId"]) // one active session per meeting/member
    .index("by_meeting_and_endTime", ["meetingId", "endTime"]),

  purchaseRequests: defineTable({
    title: v.string(),
    description: v.string(),
    estimatedCost: v.number(),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    link: v.string(),
    quantity: v.number(),
    vendorId: v.id("vendors"),
    productId: v.optional(v.id("products")),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("ordered"),
      v.literal("fulfilled"),
      v.literal("rejected")
    ),
    requestedBy: v.id("users"),
    requestedAt: v.number(),
    approvals: v.array(
      v.object({
        memberId: v.id("members"),
        approvedAt: v.number(),
      })
    ),
    rejectionReason: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_requester", ["requestedBy"]),

  purchaseOrders: defineTable({
    requestIds: v.array(v.id("purchaseRequests")),
    vendor: v.string(),
    cartLink: v.optional(v.string()),
    totalCost: v.number(),
    orderedBy: v.id("users"),
    orderedAt: v.number(),
    confirmationImageId: v.optional(v.id("_storage")),
    notes: v.optional(v.string()),
  }).index("by_orderer", ["orderedBy"]),

  pushSubscriptions: defineTable({
    memberId: v.id("members"),
    endpoint: v.string(),
    keys: v.object({
      p256dh: v.string(),
      auth: v.string(),
    }),
    createdAt: v.number(),
  })
    .index("by_member", ["memberId"])
    .index("by_endpoint", ["endpoint"]),

  muPoints: defineTable({
    memberId: v.id("members"),
    assignedByMemberId: v.id("members"),
    points: v.number(),
    reason: v.string(),
    createdAt: v.number(),
  })
    .index("by_member", ["memberId"])
    .index("by_assigned_by", ["assignedByMemberId"]),

  bounties: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    points: v.number(),
    status: v.union(
      v.literal("open"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    createdByMemberId: v.id("members"),
    createdAt: v.number(),
    completedByMemberId: v.optional(v.id("members")),
    completedAt: v.optional(v.number()),
    completionNotes: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_created_by", ["createdByMemberId"])
    .index("by_status_and_createdAt", ["status", "createdAt"]),

  vendors: defineTable({
    name: v.string(),
  }).index("by_name", ["name"]),

  products: defineTable({
    name: v.string(),
    normalizedName: v.string(),
    description: v.string(),
    link: v.string(),
    estimatedCost: v.number(),
    quantity: v.number(),
    vendorId: v.id("vendors"),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_normalized_name", ["normalizedName"])
    .index("by_vendor", ["vendorId"])
    .index("by_updated_at", ["updatedAt"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
