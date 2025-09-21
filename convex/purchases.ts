import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";
import Fuse from "fuse.js";

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

    const memberCache = new Map<Id<"members">, Doc<"members"> | null>();

    const loadMemberById = async (memberId: Id<"members">) => {
      if (!memberCache.has(memberId)) {
        memberCache.set(memberId, await ctx.db.get(memberId));
      }
      return memberCache.get(memberId) ?? null;
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

      if (request.status === "ordered" || request.status === "fulfilled") {
        throw new Error("Cannot approve a completed request");
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
    const normalizedQuery = args.q.trim().toLowerCase();
    const vendors: Array<Doc<"vendors"> & { normalizedName: string }> = [];
    const cursor = ctx.db
      .query("vendors")
      .withIndex("by_name")
      .order("asc");

    for await (const vendor of cursor) {
      const normalizedName = vendor.normalizedName || vendor.name.toLowerCase();
      vendors.push({ ...vendor, normalizedName });
      if (vendors.length >= 400) break;
    }

    if (normalizedQuery === "") {
      return vendors.slice(0, 10);
    }

    const fuse = new Fuse(vendors, {
      keys: [
        { name: "name", weight: 0.6 },
        { name: "normalizedName", weight: 0.4 },
      ],
      threshold: 0.35,
      ignoreLocation: true,
      minMatchCharLength: 1,
    });

    return fuse.search(normalizedQuery, { limit: 10 }).map((result) => result.item);
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
    const normalizedName = name.toLowerCase();

    const cursor = ctx.db
      .query("vendors")
      .withIndex("by_name")
      .order("asc");

    for await (const vendor of cursor) {
      const normalized = vendor.normalizedName || vendor.name.toLowerCase();
      if (normalized === normalizedName) {
        if (vendor.name !== name || vendor.normalizedName !== normalized) {
          await ctx.db.patch(vendor._id, {
            name,
            normalizedName,
          });
        }
        return vendor._id;
      }
    }

    const id = await ctx.db.insert("vendors", { name, normalizedName });
    return id;
  },
});

export const searchProducts = query({
  args: {
    q: v.string(),
  },
  handler: async (ctx, args) => {
    const queryText = args.q.trim().toLowerCase();
    const tokens = queryText
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 0);

    type ProductResult = Doc<"products"> & { vendorName: string };

    const vendorCache = new Map<Id<"vendors">, Doc<"vendors"> | null>();

    const loadVendor = async (vendorId: Id<"vendors">) => {
      if (!vendorCache.has(vendorId)) {
        vendorCache.set(vendorId, await ctx.db.get(vendorId));
      }
      return vendorCache.get(vendorId) ?? null;
    };

    const enrichProduct = async (product: Doc<"products">): Promise<ProductResult> => {
      const vendor = await loadVendor(product.vendorId);
      return {
        ...product,
        vendorName: vendor?.name || "Unknown",
      };
    };

    const sourceProducts = await ctx.db
      .query("products")
      .withIndex("by_updated_at")
      .order("desc")
      .take(500);

    const enriched = await Promise.all(sourceProducts.map(enrichProduct));

    if (tokens.length === 0) {
      return enriched.slice(0, 15);
    }

    const fuse = new Fuse(enriched, {
      keys: [
        { name: "name", weight: 0.45 },
        { name: "normalizedName", weight: 0.2 },
        { name: "description", weight: 0.2 },
        { name: "vendorName", weight: 0.15 },
      ],
      threshold: 0.38,
      ignoreLocation: true,
      minMatchCharLength: 1,
    });

    return fuse.search(queryText, { limit: 20 }).map((result) => result.item);
  },
});

export const ensureProduct = mutation({
  args: {
    productId: v.optional(v.id("products")),
    name: v.string(),
    description: v.string(),
    link: v.string(),
    estimatedCost: v.number(),
    quantity: v.number(),
    vendorId: v.id("vendors"),
  },
  returns: v.id("products"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const name = args.name.trim();
    if (name === "") {
      throw new Error("Product name required");
    }
    const description = args.description.trim();
    const link = args.link.trim();
    const normalizedName = name.toLowerCase();
    const now = Date.now();

    if (args.productId) {
      const existing = await ctx.db.get(args.productId);
      if (!existing) {
        throw new Error("Product not found");
      }
      await ctx.db.patch(args.productId, {
        name,
        normalizedName,
        description,
        link,
        estimatedCost: args.estimatedCost,
        quantity: args.quantity,
        vendorId: args.vendorId,
        updatedAt: now,
      });
      return args.productId;
    }

    const matches = await ctx.db
      .query("products")
      .withIndex("by_normalized_name", (q) =>
        q.eq("normalizedName", normalizedName)
      )
      .take(20);

    const existing = matches.find(
      (product) => product.vendorId === args.vendorId
    );

    if (existing) {
      await ctx.db.patch(existing._id, {
        name,
        normalizedName,
        description,
        link,
        estimatedCost: args.estimatedCost,
        quantity: args.quantity,
        vendorId: args.vendorId,
        updatedAt: now,
      });
      return existing._id;
    }

    const productId = await ctx.db.insert("products", {
      name,
      normalizedName,
      description,
      link,
      estimatedCost: args.estimatedCost,
      quantity: args.quantity,
      vendorId: args.vendorId,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });
    return productId;
  },
});
