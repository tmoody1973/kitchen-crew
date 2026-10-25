import { v, Infer } from "convex/values";
import { mutation, MutationCtx, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { activeWeek } from "./weeks";

const MAX_AMOUNT = 10_000;

// A Kroger product as it comes back from /api/price or /api/products.
const product = v.object({
  productId: v.string(),
  name: v.string(),
  size: v.optional(v.string()),
  price: v.number(),
  imageUrl: v.optional(v.string()),
});

// Only show product photos served by Kroger.
const KROGER_IMAGE = /^https:\/\/www\.kroger\.com\/product\/images\//;

function checkAmount(n: number | undefined, label: string) {
  if (n !== undefined && (!Number.isFinite(n) || n < 0 || n > MAX_AMOUNT)) {
    throw new Error(`${label} must be between $0 and $10,000`);
  }
}

/** Row fields for a chosen Kroger product, or "no price found" when there isn't one. */
function productFields(p: Infer<typeof product> | undefined) {
  if (!p) {
    return {
      estimate: undefined,
      estimateSource: "manual" as const,
      productId: undefined,
      productName: undefined,
      size: undefined,
      imageUrl: undefined,
    };
  }
  checkAmount(p.price, "Price");
  return {
    estimate: p.price,
    estimateSource: "kroger" as const,
    productId: p.productId.slice(0, 20),
    productName: p.name.slice(0, 200),
    size: p.size?.slice(0, 40),
    imageUrl: p.imageUrl && KROGER_IMAGE.test(p.imageUrl) ? p.imageUrl : undefined,
  };
}

/** Loads an item only if it belongs to the signed-in user's current week. */
async function ownItem(ctx: MutationCtx, id: Id<"listItems">) {
  const week = await activeWeek(ctx);
  const item = await ctx.db.get(id);
  if (!week || !item || item.weekId !== week._id) throw new Error("Item not found");
  return item;
}

/** This week's shopping list, oldest first. Empty if no week is active. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const week = await activeWeek(ctx);
    if (!week) return [];
    return await ctx.db
      .query("listItems")
      .withIndex("by_week", (q) => q.eq("weekId", week._id))
      .collect();
  },
});

export const add = mutation({
  args: { name: v.string(), product: v.optional(product) },
  handler: async (ctx, { name, product }) => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 80) throw new Error("Item name must be 1–80 characters");
    const week = await activeWeek(ctx);
    if (!week) throw new Error("Set this week's budget first");
    return await ctx.db.insert("listItems", { weekId: week._id, name: trimmed, packs: 1, ...productFields(product) });
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
    await ctx.db.patch(id, { estimate, estimateSource: "manual" });
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
