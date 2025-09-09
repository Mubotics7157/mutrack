import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

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

        return {
          ...request,
          requesterName: requester?.name || "Unknown",
          approverName: approver?.name || null,
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
    status: v.union(
      v.literal("approved"),
      v.literal("rejected")
    ),
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
        const request = await ctx.db.get(order.requestId);
        const orderer = await ctx.db
          .query("members")
          .withIndex("by_user", (q) => q.eq("userId", order.orderedBy))
          .unique();

        let confirmationImageUrl = null;
        if (order.confirmationImageId) {
          confirmationImageUrl = await ctx.storage.getUrl(order.confirmationImageId);
        }

        return {
          ...order,
          request,
          ordererName: orderer?.name || "Unknown",
          confirmationImageUrl,
        };
      })
    );

    return ordersWithDetails;
  },
});

export const createPurchaseOrder = mutation({
  args: {
    requestId: v.id("purchaseRequests"),
    vendor: v.string(),
    cartLink: v.optional(v.string()),
    totalCost: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!member || (member.role !== "admin" && member.role !== "lead")) {
      throw new Error("Only admins and leads can create purchase orders");
    }

    // Update request status to ordered
    await ctx.db.patch(args.requestId, { status: "ordered" });

    return await ctx.db.insert("purchaseOrders", {
      ...args,
      orderedBy: userId,
      orderedAt: Date.now(),
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

export const updateOrderConfirmation = mutation({
  args: {
    orderId: v.id("purchaseOrders"),
    confirmationImageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!member || (member.role !== "admin" && member.role !== "lead")) {
      throw new Error("Only admins and leads can update order confirmations");
    }

    await ctx.db.patch(args.orderId, {
      confirmationImageId: args.confirmationImageId,
    });

    // Update the related request to fulfilled
    const order = await ctx.db.get(args.orderId);
    if (order) {
      await ctx.db.patch(order.requestId, { status: "fulfilled" });
    }
  },
});
