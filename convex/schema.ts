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
    profileImageId: v.optional(v.id("_storage")),
    smsCheckInEnabled: v.optional(v.boolean()), // defaults to true; false to opt out of SMS check-ins
  })
    .index("by_user", ["userId"])
    .index("by_notifications_enabled", ["notificationsEnabled"]),

  smsCheckInTokens: defineTable({
    memberId: v.id("members"),
    meetingId: v.id("meetings"),
    token: v.string(), // 12-char alphanumeric (for URL)
    tokenHash: v.string(), // SHA-256 for secure lookup
    createdAt: v.number(),
    expiresAt: v.number(), // Meeting end + 30 min
    usedForCheckIn: v.optional(v.boolean()),
    checkInTime: v.optional(v.number()),
    checkOutTime: v.optional(v.number()),
    reminderSent: v.optional(v.boolean()),
    sessionInvalidated: v.optional(v.boolean()),
  })
    .index("by_tokenHash", ["tokenHash"])
    .index("by_member_meeting", ["memberId", "meetingId"])
    .index("by_meeting", ["meetingId"]),

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
    scannerMemberId: v.optional(v.id("members")), // admin/lead operating the scanner (for web scanning)
    scannerDeviceId: v.optional(v.id("scanners")), // device scanner (for companion app)
    isManual: v.optional(v.boolean()), // true for manual sign-ins, undefined/false for beacon
    isSmsCheckIn: v.optional(v.boolean()), // true for SMS-based check-ins
    smsTokenId: v.optional(v.id("smsCheckInTokens")), // reference to the SMS token used
  })
    .index("by_meeting", ["meetingId"])
    .index("by_member", ["memberId"])
    .index("by_meeting_and_member", ["meetingId", "memberId"]) // one active session per meeting/member
    .index("by_meeting_and_endTime", ["meetingId", "endTime"]),

  scanners: defineTable({
    name: v.string(), // Human-readable name (e.g., "Lab Room Scanner")
    apiKeyHash: v.string(), // SHA-256 hash of API key
    apiKeyPrefix: v.string(), // First 8 chars for display (e.g., "msk_abc1...")
    location: v.optional(v.string()), // Physical location description
    registeredBy: v.id("members"), // Admin who registered this scanner
    createdAt: v.number(),
    lastSeenAt: v.optional(v.number()), // Last heartbeat/sighting timestamp
    isActive: v.boolean(), // Can be disabled without deletion
    metadata: v.optional(
      v.object({
        platform: v.optional(v.string()), // "raspberrypi", "macos", etc.
        version: v.optional(v.string()), // Scanner app version
        hostname: v.optional(v.string()), // Device hostname
      })
    ),
  })
    .index("by_apiKeyHash", ["apiKeyHash"]) // For authentication lookup
    .index("by_isActive", ["isActive"]),

  // Beacons detected by scanners but not yet paired to a member
  unpairedBeacons: defineTable({
    key: v.string(), // canonical beacon identifier (ibeacon:uuid:major:minor)
    uuid: v.string(),
    major: v.number(),
    minor: v.number(),
    firstSeenAt: v.number(),
    lastSeenAt: v.number(),
    lastSeenByScannerId: v.id("scanners"),
    sightingCount: v.number(), // how many times seen
  })
    .index("by_key", ["key"])
    .index("by_lastSeenAt", ["lastSeenAt"]),

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
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
    approvals: v.optional(
      v.array(
        v.object({
          memberId: v.id("members"),
          approvedAt: v.number(),
        })
      )
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
    status: v.union(v.literal("pending"), v.literal("placed")),
    orderedBy: v.id("users"),
    orderedAt: v.number(),
    placedBy: v.optional(v.id("users")),
    placedAt: v.optional(v.number()),
    confirmationImageId: v.optional(v.id("_storage")),
    notes: v.optional(v.string()),
    placementNotes: v.optional(v.string()),
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
    normalizedName: v.optional(v.string()),
  })
    .index("by_normalized_name", ["normalizedName"])
    .index("by_name", ["name"]),

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

  shootingVideos: defineTable({
    videoStorageId: v.id("_storage"),
    thumbnailStorageId: v.optional(v.id("_storage")),
    robot: v.union(v.literal("alpha"), v.literal("beta")),
    flywheelRpm: v.number(),
    hoodAngle: v.number(), // degrees
    notes: v.optional(v.string()),
    uploadedBy: v.id("members"),
    uploadedAt: v.number(),
    fileSize: v.optional(v.number()), // bytes
    mimeType: v.optional(v.string()),
  })
    .index("by_robot", ["robot"])
    .index("by_uploaded_at", ["uploadedAt"])
    .index("by_uploader", ["uploadedBy"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
