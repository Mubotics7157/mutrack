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

    const memberCache = new Map<string, Awaited<ReturnType<typeof ctx.db.get>> | null>();

    const loadMemberById = async (memberId: string) => {
      if (!memberCache.has(memberId)) {
        memberCache.set(memberId, await ctx.db.get(memberId as any));
      }
      return memberCache.get(memberId);
    };

    // Get member info for each request
    const requestsWithMembers = await Promise.all(
      requests.map(async (request) => {
        const requester = await ctx.db
          .query("members")
          .withIndex("by_user", (q) => q.eq("userId", request.requestedBy))
          .unique();

        const vendor = await ctx.db.get(request.vendorId);

        const approvalsWithNames = await Promise.all(
          (request.approvals ?? []).map(async (approval) => {
            const member = await loadMemberById(approval.memberId);
            return {
              ...approval,
              memberName: member?.name || "Unknown",
            };
          })
        );

        return {
          ...request,
          approvals: approvalsWithNames,
          requesterName: requester?.name || "Unknown",
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
    productId: v.optional(v.id("products")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("purchaseRequests", {
      ...args,
      status: "pending",
      requestedBy: userId,
      requestedAt: Date.now(),
      approvals: [],
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

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Request not found");
    }

    if (args.status === "approved") {
      if (request.status === "rejected") {
        throw new Error("Cannot approve a rejected request");
      }

      const existingApprovals = request.approvals ?? [];
      const alreadyApproved = existingApprovals.some(
        (approval) => approval.memberId === member._id
      );

      if (alreadyApproved) {
        if (request.status !== "approved") {
          await ctx.db.patch(args.requestId, { status: "approved" });
        }
        return;
      }

      await ctx.db.patch(args.requestId, {
        status: "approved",
        approvals: [
          ...existingApprovals,
          { memberId: member._id, approvedAt: Date.now() },
        ],
        rejectionReason: undefined,
      });
      return;
    }

    await ctx.db.patch(args.requestId, {
      status: "rejected",
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
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!member || (member.role !== "admin" && member.role !== "lead")) {
      throw new Error("Only admins and leads can create purchase orders");
    }

    // Update requests status to ordered
    for (const requestId of args.requestIds) {
      await ctx.db.patch(requestId, { status: "ordered" });
    }

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

    // Update the related requests to fulfilled
    const order = await ctx.db.get(args.orderId);
    if (order) {
      for (const requestId of order.requestIds) {
        await ctx.db.patch(requestId, { status: "fulfilled" });
      }
    }
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
