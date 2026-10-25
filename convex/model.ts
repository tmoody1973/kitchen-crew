// Shared building blocks for Convex functions. Imports nothing from other function files,
// so there are no circular imports (weeks ↔ regulars ↔ listItems).
import { v, Infer } from "convex/values";
import { MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { isWeekActive } from "../lib/tally";

export async function requireUserId(ctx: QueryCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not signed in");
  return identity.subject;
}

/** The signed-in user's week if it's still within its 7 days, else null. */
export async function activeWeek(ctx: QueryCtx) {
  const userId = await requireUserId(ctx);
  const week = await ctx.db
    .query("weeks")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .order("desc")
    .first();
  return week && isWeekActive(week.startDate, Date.now()) ? week : null;
}


export const MAX_AMOUNT = 10_000;

// A Kroger product as it comes back from /api/price or /api/products.
export const product = v.object({
  productId: v.string(),
  name: v.string(),
  size: v.optional(v.string()),
  price: v.number(),
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

