import { v } from "convex/values";
import { mutation, MutationCtx, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { activeWeek, addRegularsToWeek, product, productFields, requireUserId } from "./model";

async function mineList(ctx: MutationCtx | Parameters<typeof requireUserId>[0], userId: string) {
  return await ctx.db
    .query("regulars")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
}

export const mine = query({
  args: {},
  handler: async (ctx) => mineList(ctx, await requireUserId(ctx)),
});

/** Adds a regular (priced at the store if a product is given). */
export const add = mutation({
  args: { name: v.string(), product: v.optional(product) },
  handler: async (ctx, { name, product }) => {
    const n = name.trim();
    if (!n || n.length > 80) throw new Error("Name must be 1–80 characters");
    const userId = await requireUserId(ctx);
    const existing = (await mineList(ctx, userId)).find((r) => r.name.toLowerCase() === n.toLowerCase());
    if (existing) return existing._id;
    const { estimate, productId, productName, size, imageUrl } = productFields(product);
    return await ctx.db.insert("regulars", { userId, name: n, packs: 1, estimate, productId, productName, size, imageUrl });
  },
});

async function ownRegular(ctx: MutationCtx, id: Id<"regulars">) {
  const userId = await requireUserId(ctx);
  const r = await ctx.db.get(id);
  if (!r || r.userId !== userId) throw new Error("Regular not found");
  return r;
}

export const setPacks = mutation({
  args: { id: v.id("regulars"), packs: v.number() },
  handler: async (ctx, { id, packs }) => {
    if (!Number.isInteger(packs) || packs < 1 || packs > 50) throw new Error("Packs must be 1–50");
    await ownRegular(ctx, id);
    await ctx.db.patch(id, { packs });
  },
});

export const remove = mutation({
  args: { id: v.id("regulars") },
  handler: async (ctx, { id }) => {
    await ownRegular(ctx, id);
    await ctx.db.delete(id);
  },
});

/**
 * "Add regulars" on the List. `prices` are today's Kroger prices at the current store (same product, by id);
 * they refresh the saved regulars first, so the list gets current prices.
 */
export const addToList = mutation({
  args: { prices: v.optional(v.array(v.object({ id: v.id("regulars"), product: v.optional(product) }))) },
  handler: async (ctx, { prices }) => {
    const userId = await requireUserId(ctx);
    const week = await activeWeek(ctx);
    if (!week) throw new Error("Set this week's budget first");
    for (const { id, product: p } of prices ?? []) {
      const r = await ctx.db.get(id);
      if (!r || r.userId !== userId || !p) continue; // no price today: keep the last known one
      const { estimate, productId, productName, size, imageUrl } = productFields(p);
      await ctx.db.patch(id, { estimate, productId, productName, size, imageUrl });
    }
    return await addRegularsToWeek(ctx, userId, week._id);
  },
});

/** Picks a different brand/size for a regular (or prices one that had no price). */
export const setProduct = mutation({
  args: { id: v.id("regulars"), product },
  handler: async (ctx, { id, product }) => {
    await ownRegular(ctx, id);
    const { estimate, productId, productName, size, imageUrl } = productFields(product);
    await ctx.db.patch(id, { estimate, productId, productName, size, imageUrl });
  },
});
