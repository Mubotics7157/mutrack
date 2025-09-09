import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  members: defineTable({
    userId: v.id("users"),
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("lead"), v.literal("member")),
    joinedAt: v.number(),
  }).index("by_user", ["userId"]),

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

  purchaseRequests: defineTable({
    title: v.string(),
    description: v.string(),
    estimatedCost: v.number(),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    link: v.string(),
    quantity: v.number(),
    vendorId: v.id("vendors"),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("ordered"),
      v.literal("fulfilled"),
      v.literal("rejected")
    ),
    requestedBy: v.id("users"),
    requestedAt: v.number(),
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
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

  vendors: defineTable({
    name: v.string(),
  }).index("by_name", ["name"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
