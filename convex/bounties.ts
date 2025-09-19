import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id, type Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

async function requireAuthenticatedMember(
  ctx: MutationCtx
): Promise<Doc<"members">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const member = await ctx.db
    .query("members")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();

  if (!member) throw new Error("Member not found");

  return member;
}

function ensureCanManageBounties(member: Pick<Doc<"members">, "role">) {
  if (member.role !== "admin" && member.role !== "lead") {
    throw new Error("Only admins and leads can manage bounties");
  }
}

type MinimalMember = Pick<Doc<"members">, "_id" | "name">;

const bountyResult = v.object({
  _id: v.id("bounties"),
  title: v.string(),
  description: v.union(v.string(), v.null()),
  points: v.number(),
  status: v.union(
    v.literal("open"),
    v.literal("completed"),
    v.literal("cancelled")
  ),
  createdAt: v.number(),
  createdBy: v.object({
    memberId: v.id("members"),
    name: v.string(),
  }),
  completedAt: v.union(v.number(), v.null()),
  completedBy: v.union(
    v.object({
      memberId: v.id("members"),
      name: v.string(),
    }),
    v.null()
  ),
  completionNotes: v.union(v.string(), v.null()),
});

function mapBounty(
  bounty: Doc<"bounties">,
  members: Map<Id<"members">, MinimalMember>
) {
  const creator = members.get(bounty.createdByMemberId);
  const completer = bounty.completedByMemberId
    ? members.get(bounty.completedByMemberId)
    : undefined;

  return {
    _id: bounty._id,
    title: bounty.title,
    description: bounty.description ?? null,
    points: bounty.points,
    status: bounty.status,
    createdAt: bounty.createdAt,
    createdBy: creator
      ? { memberId: creator._id, name: creator.name }
      : { memberId: bounty.createdByMemberId, name: "Unknown" },
    completedAt: bounty.completedAt ?? null,
    completedBy: completer
      ? { memberId: completer._id, name: completer.name }
      : null,
    completionNotes: bounty.completionNotes ?? null,
  };
}

export const createBounty = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    points: v.number(),
  },
  returns: v.id("bounties"),
  handler: async (ctx, args) => {
    const member = await requireAuthenticatedMember(ctx);
    ensureCanManageBounties(member);

    const title = args.title.trim();
    if (!title) throw new Error("A title is required");

    if (!Number.isFinite(args.points) || args.points <= 0) {
      throw new Error("Points must be a positive number");
    }

    const description = args.description?.trim();

    return await ctx.db.insert("bounties", {
      title,
      description: description ? description : undefined,
      points: args.points,
      status: "open",
      createdByMemberId: member._id,
      createdAt: Date.now(),
    });
  },
});

export const completeBounty = mutation({
  args: {
    bountyId: v.id("bounties"),
    completedByMemberId: v.id("members"),
    completionNotes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actingMember = await requireAuthenticatedMember(ctx);
    ensureCanManageBounties(actingMember);

    const bounty = await ctx.db.get(args.bountyId);
    if (!bounty) throw new Error("Bounty not found");
    if (bounty.status !== "open") {
      throw new Error("Only open bounties can be completed");
    }

    const completedMember = await ctx.db.get(args.completedByMemberId);
    if (!completedMember) throw new Error("Member not found");

    const notes = args.completionNotes?.trim();
    const now = Date.now();

    await ctx.db.patch(args.bountyId, {
      status: "completed",
      completedByMemberId: args.completedByMemberId,
      completedAt: now,
      completionNotes: notes ? notes : undefined,
    });

    const reasonParts = [`bounty completed: ${bounty.title}`];
    if (notes) {
      reasonParts.push(notes);
    }

    await ctx.db.insert("muPoints", {
      memberId: args.completedByMemberId,
      assignedByMemberId: actingMember._id,
      points: bounty.points,
      reason: reasonParts.join(" — "),
      createdAt: now,
    });

    return null;
  },
});

export const getBounties = query({
  args: {},
  returns: v.object({
    openBounties: v.array(bountyResult),
    recentlyCompleted: v.array(bountyResult),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { openBounties: [], recentlyCompleted: [] };
    }

    const openBounties = await ctx.db
      .query("bounties")
      .withIndex("by_status_and_createdAt", (q) => q.eq("status", "open"))
      .order("asc")
      .collect();

    const completedBounties = await ctx.db
      .query("bounties")
      .withIndex("by_status_and_createdAt", (q) => q.eq("status", "completed"))
      .order("desc")
      .take(10);

    const memberIds = new Set<Id<"members">>();
    for (const bounty of [...openBounties, ...completedBounties]) {
      memberIds.add(bounty.createdByMemberId);
      if (bounty.completedByMemberId) {
        memberIds.add(bounty.completedByMemberId);
      }
    }

    const members = await Promise.all(
      Array.from(memberIds).map((id) => ctx.db.get(id))
    );

    const memberMap = new Map<Id<"members">, MinimalMember>();
    for (const member of members) {
      if (member) {
        memberMap.set(member._id, { _id: member._id, name: member.name });
      }
    }

    return {
      openBounties: openBounties.map((bounty) => mapBounty(bounty, memberMap)),
      recentlyCompleted: completedBounties.map((bounty) =>
        mapBounty(bounty, memberMap)
      ),
    };
  },
});

