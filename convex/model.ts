// Shared building blocks for Convex functions. Imports nothing from other function files,
// so there are no circular imports (weeks ↔ regulars ↔ listItems).
import { v, Infer } from "convex/values";
import { MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { currentWeek, nextWeekOf, WEEK_MS } from "../lib/weeks";
import { priceBoard } from "../lib/meal-plan";

export async function requireUserId(ctx: QueryCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not signed in");
  return identity.subject;
}

export async function userWeeks(ctx: QueryCtx, userId: string) {
  return await ctx.db
    .query("weeks")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
}

/** This week: the signed-in user's week whose 7 days include now (a week made ahead takes over on its first day). */
export async function activeWeek(ctx: QueryCtx) {
  return currentWeek(await userWeeks(ctx, await requireUserId(ctx)), Date.now());
}

/** This week (offset 0) or next week (offset 1), if it exists. */
export async function weekForOffset(ctx: QueryCtx, offset: number) {
  const weeks = await userWeeks(ctx, await requireUserId(ctx));
  const current = currentWeek(weeks, Date.now());
  if (!current) return null;
  return offset === 1 ? nextWeekOf(weeks, current) : current;
}

/** A week only if it belongs to the signed-in user. */
export async function ownWeek(ctx: QueryCtx, weekId: Id<"weeks">) {
  const userId = await requireUserId(ctx);
  const week = await ctx.db.get(weekId);
  if (!week || week.userId !== userId) throw new Error("Week not found");
  return week;
}

/**
 * Rebuilds a week's board-managed shopping rows from its scheduled dinners.
 * Paid rows and rows Tarik added himself are never touched; neither are rows from older plans (no fromBoard flag).
 */
export async function rebuildWeek(ctx: MutationCtx, weekId: Id<"weeks">) {
  const meals = await ctx.db.query("meals").withIndex("by_week", (q) => q.eq("weekId", weekId)).collect();
  const rows = await ctx.db.query("listItems").withIndex("by_week", (q) => q.eq("weekId", weekId)).collect();
  const kept = [];
  for (const row of rows) {
    if (row.fromBoard && row.paid === undefined) await ctx.db.delete(row._id);
    else kept.push(row);
  }
  const priced = priceBoard(
    meals.map((m) => ({
      name: m.name,
      dayIndex: m.dayIndex,
      servings: m.servings,
      ingredients: m.ingredients,
      products: m.products?.map((p) => ({ name: p.name, product: p.product ?? null })),
    })),
    0,
  );
  if (!priced) return;
  const onList = new Set(kept.map((r) => r.name.trim().toLowerCase()));
  for (const item of priced.items) {
    if (item.pantry || onList.has(item.name.toLowerCase())) continue;
    const p = item.product;
    await ctx.db.insert("listItems", {
      weekId,
      name: item.name.slice(0, 80),
      packs: item.packs,
      fromPlan: true,
      fromBoard: true,
      category: "dinner",
      ...productFields(p ? { productId: p.productId, name: p.name, size: p.size, price: p.price, regularPrice: p.regularPrice, imageUrl: p.imageUrl } : undefined),
    });
  }
}


export const MAX_AMOUNT = 10_000;

// A Kroger product as it comes back from /api/price or /api/products.
export const product = v.object({
  productId: v.string(),
  name: v.string(),
  size: v.optional(v.string()),
  price: v.number(),
  regularPrice: v.optional(v.number()), // set when on sale; price is the sale price
  imageUrl: v.optional(v.string()),
});

// Only show product photos served by Kroger.
const KROGER_IMAGE = /^https:\/\/www\.kroger\.com\/product\/images\//;

export function checkAmount(n: number | undefined, label: string) {
  if (n !== undefined && (!Number.isFinite(n) || n < 0 || n > MAX_AMOUNT)) {
    throw new Error(`${label} must be between $0 and $10,000`);
  }
}

/** Row fields for a chosen Kroger product, or "no price found" when there isn't one. */
export function productFields(p: Infer<typeof product> | undefined) {
  if (!p) {
    return {
      estimate: undefined,
      regularPrice: undefined,
      estimateSource: "manual" as const,
      productId: undefined,
      productName: undefined,
      size: undefined,
      imageUrl: undefined,
    };
  }
  checkAmount(p.price, "Price");
  checkAmount(p.regularPrice, "Regular price");
  return {
    estimate: p.price,
    regularPrice: p.regularPrice !== undefined && p.regularPrice > p.price ? p.regularPrice : undefined,
    estimateSource: "kroger" as const,
    productId: p.productId.slice(0, 20),
    productName: p.name.slice(0, 200),
    size: p.size?.slice(0, 40),
    imageUrl: p.imageUrl && KROGER_IMAGE.test(p.imageUrl) ? p.imageUrl : undefined,
  };
}


/** Copies regulars onto a week's list as extras, skipping anything already on it. Returns how many were added. */
export async function addRegularsToWeek(ctx: MutationCtx, userId: string, weekId: Id<"weeks">): Promise<number> {
  const regulars = await ctx.db.query("regulars").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
  const onList = new Set(
    (await ctx.db.query("listItems").withIndex("by_week", (q) => q.eq("weekId", weekId)).collect()).map((i) =>
      i.name.trim().toLowerCase(),
    ),
  );
  let added = 0;
  for (const r of regulars) {
    if (onList.has(r.name.toLowerCase())) continue;
    await ctx.db.insert("listItems", {
      weekId,
      name: r.name,
      packs: r.packs,
      category: "extra",
      estimate: r.estimate,
      estimateSource: r.estimate === undefined ? "manual" : "kroger",
      productId: r.productId,
      productName: r.productName,
      size: r.size,
      imageUrl: r.imageUrl,
    });
    added++;
  }
  return added;
}


/** Next week, created on first use with this week's budget, split, and store (and regulars, if auto-add is on). */
export async function ensureNextWeek(ctx: MutationCtx) {
  const userId = await requireUserId(ctx);
  const weeks = await userWeeks(ctx, userId);
  const current = currentWeek(weeks, Date.now());
  if (!current) throw new Error("Set this week's budget first");
  const existing = nextWeekOf(weeks, current);
  if (existing) return existing;
  const weekId = await ctx.db.insert("weeks", {
    userId,
    budget: current.budget,
    planLevel: current.planLevel,
    startDate: current.startDate + WEEK_MS,
    storeId: current.storeId,
    storeName: current.storeName,
    extrasBudget: current.extrasBudget,
  });
  const household = await ctx.db.query("household").withIndex("by_user", (q) => q.eq("userId", userId)).first();
  if (household?.autoRegulars) await addRegularsToWeek(ctx, userId, weekId);
  return (await ctx.db.get(weekId))!;
}
