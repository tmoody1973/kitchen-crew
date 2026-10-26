import { v } from "convex/values";
import { mutation, MutationCtx, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { checkAmount, ownWeek, product, productFields, weekForOffset } from "./model";

/** Loads an item only if it's on one of the signed-in user's weeks. */
async function ownItem(ctx: MutationCtx, id: Id<"listItems">) {
  const item = await ctx.db.get(id);
  if (!item) throw new Error("Item not found");
  await ownWeek(ctx, item.weekId).catch(() => {
    throw new Error("Item not found");
  });
  return item;
}

/** This week's (offset 0) or next week's (offset 1) shopping list, oldest first. */
export const mine = query({
  args: { offset: v.optional(v.number()) },
  handler: async (ctx, { offset }) => {
    const week = await weekForOffset(ctx, offset ?? 0);
    if (!week) return [];
    return await ctx.db
      .query("listItems")
      .withIndex("by_week", (q) => q.eq("weekId", week._id))
      .collect();
  },
});

export const add = mutation({
  args: { name: v.string(), product: v.optional(product), offset: v.optional(v.number()) },
  handler: async (ctx, { name, product, offset }) => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 80) throw new Error("Item name must be 1–80 characters");
    const week = await weekForOffset(ctx, offset ?? 0);
    if (!week) throw new Error("Set this week's budget first");
    return await ctx.db.insert("listItems", { weekId: week._id, name: trimmed, packs: 1, category: "extra", ...productFields(product) });
  },
});

/** Picks a different brand/size for a row. */
export const setProduct = mutation({
  args: { id: v.id("listItems"), product },
  handler: async (ctx, { id, product }) => {
    await ownItem(ctx, id);
    await ctx.db.patch(id, productFields(product));
  },
});

/** How many packages to buy (1–50). */
export const setPacks = mutation({
  args: { id: v.id("listItems"), packs: v.number() },
  handler: async (ctx, { id, packs }) => {
    if (!Number.isInteger(packs) || packs < 1 || packs > 50) throw new Error("Packs must be 1–50");
    await ownItem(ctx, id);
    await ctx.db.patch(id, { packs });
  },
});

/** What was actually paid; omit `paid` to clear the box. */
export const setPaid = mutation({
  args: { id: v.id("listItems"), paid: v.optional(v.number()) },
  handler: async (ctx, { id, paid }) => {
    checkAmount(paid, "Paid amount");
    await ownItem(ctx, id);
    await ctx.db.patch(id, { paid });
  },
});

/** Typed-in estimate for "no price found" rows. */
export const setEstimate = mutation({
  args: { id: v.id("listItems"), estimate: v.optional(v.number()) },
  handler: async (ctx, { id, estimate }) => {
    checkAmount(estimate, "Estimate");
    await ownItem(ctx, id);
    await ctx.db.patch(id, { estimate, estimateSource: "manual", regularPrice: undefined, snap: undefined });
  },
});

/** New Kroger prices after switching stores. Missing product → "no price found". */
export const applyPrices = mutation({
  args: { prices: v.array(v.object({ id: v.id("listItems"), product: v.optional(product) })) },
  handler: async (ctx, { prices }) => {
    for (const { id, product } of prices) {
      await ownItem(ctx, id);
      await ctx.db.patch(id, productFields(product));
    }
  },
});

/** Takes an item off this week's list (and out of the tally). */
export const remove = mutation({
  args: { id: v.id("listItems") },
  handler: async (ctx, { id }) => {
    await ownItem(ctx, id);
    await ctx.db.delete(id);
  },
});

/** Label a row as a dinner ingredient or an extra. */
export const setCategory = mutation({
  args: { id: v.id("listItems"), category: v.union(v.literal("dinner"), v.literal("extra")) },
  handler: async (ctx, { id, category }) => {
    await ownItem(ctx, id);
    await ctx.db.patch(id, { category });
  },
});
