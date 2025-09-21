import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

async function requireUserId(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

async function requireOrderManager(ctx: any, userId: string) {
  const member = await ctx.db
    .query("members")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .unique();

  if (!member || (member.role !== "admin" && member.role !== "lead")) {
    throw new Error("Only admins and leads can manage purchase orders");
  }

  return member;
}

async function upsertOrderPlacement(
  ctx: any,
  order: any,
  userId: string,
  {
    confirmationImageId,
    placementNotes,
    totalCost,
  }: {
    confirmationImageId?: string;
    placementNotes?: string;
    totalCost?: number;
  }
) {
  const patch: Record<string, any> = {};

  if (typeof totalCost === "number" && !Number.isNaN(totalCost)) {
    patch.totalCost = totalCost;
  }

  if (confirmationImageId !== undefined) {
    patch.confirmationImageId = confirmationImageId;
  }

  if (placementNotes !== undefined) {
    patch.placementNotes = placementNotes.trim() === "" ? undefined : placementNotes;
  }

  const shouldMarkPlaced = order.status !== "placed";
  if (shouldMarkPlaced) {
    patch.status = "placed";
    patch.placedAt = Date.now();
    patch.placedBy = userId;
  } else {
    // preserve first placer details
    patch.status = "placed";
    if (!order.placedAt) {
      patch.placedAt = Date.now();
    }
    if (!order.placedBy) {
      patch.placedBy = userId;
    }
  }

  await ctx.db.patch(order._id, patch);
}

export const getPurchaseRequests = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const requests = await ctx.db
      .query("purchaseRequests")
      .withIndex("by_status")
      .order("desc")
      .collect();

    // Get member info for each request
    const requestsWithMembers = await Promise.all(
      requests.map(async (request) => {
        const requester = await ctx.db
          .query("members")
          .withIndex("by_user", (q) => q.eq("userId", request.requestedBy))
          .unique();

        let approver = null;
        if (request.approvedBy) {
          approver = await ctx.db
            .query("members")
            .withIndex("by_user", (q) => q.eq("userId", request.approvedBy!))
            .unique();
        }

        const vendor = await ctx.db.get(request.vendorId);

        return {
          ...request,
          requesterName: requester?.name || "Unknown",
          approverName: approver?.name || null,
          vendorName: vendor?.name || "Unknown",
        };
      })
    );

    return requestsWithMembers;
  },
});

export const createPurchaseRequest = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    estimatedCost: v.number(),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    link: v.string(),
    quantity: v.number(),
    vendorId: v.id("vendors"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("purchaseRequests", {
      ...args,
      status: "pending",
      requestedBy: userId,
      requestedAt: Date.now(),
    });
  },
});

export const updateRequestStatus = mutation({
  args: {
    requestId: v.id("purchaseRequests"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!member || (member.role !== "admin" && member.role !== "lead")) {
      throw new Error("Only admins and leads can approve/reject requests");
    }

    await ctx.db.patch(args.requestId, {
      status: args.status,
      approvedBy: userId,
      approvedAt: Date.now(),
      rejectionReason: args.rejectionReason,
    });
  },
});

export const getPurchaseOrders = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const orders = await ctx.db.query("purchaseOrders").collect();

    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const requests = await Promise.all(
          order.requestIds.map((id) => ctx.db.get(id))
        );
        const orderer = await ctx.db
          .query("members")
          .withIndex("by_user", (q) => q.eq("userId", order.orderedBy))
          .unique();

        let placerName: string | null = null;
        if (order.placedBy) {
          const placer = await ctx.db
            .query("members")
            .withIndex("by_user", (q) => q.eq("userId", order.placedBy!))
            .unique();
          placerName = placer?.name || null;
        }

        let confirmationImageUrl = null;
        if (order.confirmationImageId) {
          confirmationImageUrl = await ctx.storage.getUrl(
            order.confirmationImageId
          );
        }

        return {
          ...order,
          requests: requests.filter(Boolean),
          ordererName: orderer?.name || "Unknown",
          placedByName: placerName,
          status: order.status || "placed",
          confirmationImageUrl,
        };
      })
    );

    return ordersWithDetails;
  },
});

export const createPurchaseOrder = mutation({
  args: {
    requestIds: v.array(v.id("purchaseRequests")),
    vendor: v.string(),
    cartLink: v.optional(v.string()),
    totalCost: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await requireOrderManager(ctx, userId);

    // Update requests status to ordered
    for (const requestId of args.requestIds) {
      await ctx.db.patch(requestId, { status: "ordered" });
    }

    return await ctx.db.insert("purchaseOrders", {
      ...args,
      orderedBy: userId,
      orderedAt: Date.now(),
      status: "pending",
    });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.storage.generateUploadUrl();
  },
});

export const markPurchaseOrderPlaced = mutation({
  args: {
    orderId: v.id("purchaseOrders"),
    confirmationImageId: v.optional(v.id("_storage")),
    placementNotes: v.optional(v.string()),
    totalCost: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await requireOrderManager(ctx, userId);

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    await upsertOrderPlacement(ctx, order, userId, {
      confirmationImageId: args.confirmationImageId,
      placementNotes: args.placementNotes,
      totalCost: args.totalCost,
    });
  },
});

export const updateOrderConfirmation = mutation({
  args: {
    orderId: v.id("purchaseOrders"),
    confirmationImageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await requireOrderManager(ctx, userId);

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    await upsertOrderPlacement(ctx, order, userId, {
      confirmationImageId: args.confirmationImageId,
    });
  },
});

// Vendor helpers
export const searchVendors = query({
  args: {
    q: v.string(),
  },
  handler: async (ctx, args) => {
    const queryText = args.q.trim();
    if (queryText === "") {
      // return a few vendors for empty input
      return await ctx.db.query("vendors").take(10);
    }
    // Prefix search using index range
    const lower = queryText;
    const upper = queryText + "\uffff";
    const results = [];
    const cursor = ctx.db
      .query("vendors")
      .withIndex("by_name", (q) => q.gte("name", lower))
      .order("asc");
    for await (const vendor of cursor) {
      if (vendor.name >= lower && vendor.name < upper) {
        results.push(vendor);
        if (results.length >= 10) break;
      } else if (vendor.name >= upper) {
        break;
      }
    }
    return results;
  },
});

export const ensureVendor = mutation({
  args: { name: v.string() },
  returns: v.id("vendors"),
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (name === "") {
      throw new Error("Vendor name required");
    }
    const existing = await ctx.db
      .query("vendors")
      .withIndex("by_name", (q) => q.eq("name", name))
      .unique();
    if (existing) return existing._id;
    const id = await ctx.db.insert("vendors", { name });
    return id;
  },
});
