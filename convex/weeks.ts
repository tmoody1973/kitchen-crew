import { v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";
import { isWeekActive } from "../lib/tally";

const planLevel = v.union(v.literal("thrifty"), v.literal("low"), v.literal("moderate"), v.literal("custom"));

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

/** The signed-in user's most recent week. The page decides if it's still active. */
export const latest = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("weeks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .first();
  },
});

/** Changes this week's budget, or starts a new 7-day week if none is active. */
export const setBudget = mutation({
  args: { budget: v.number(), planLevel },
  handler: async (ctx, { budget, planLevel }) => {
    if (!Number.isFinite(budget) || budget <= 0 || budget > 10_000) {
      throw new Error("Budget must be between $1 and $10,000");
    }
    const userId = await requireUserId(ctx);
    const current = await activeWeek(ctx);
    if (current) {
      await ctx.db.patch(current._id, { budget, planLevel });
      return current._id;
    }
    // A new week starts at the store you used last.
    const previous = await ctx.db
      .query("weeks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .first();
    return await ctx.db.insert("weeks", {
      userId,
      budget,
      planLevel,
      startDate: Date.now(),
      storeId: previous?.storeId,
      storeName: previous?.storeName,
    });
  },
});

/** Which store you're shopping at this week; prices come from there. */
export const setStore = mutation({
  args: { storeId: v.string(), storeName: v.string() },
  handler: async (ctx, { storeId, storeName }) => {
    if (!/^\d{1,12}$/.test(storeId) || !storeName.trim() || storeName.length > 120) {
      throw new Error("Invalid store");
    }
    const week = await activeWeek(ctx);
    if (!week) throw new Error("Set this week's budget first");
    await ctx.db.patch(week._id, { storeId, storeName: storeName.trim(), otherStore: undefined });
  },
});

/** Shopping at a non-Kroger store; rows keep comparing against the last Kroger store's prices. */
export const setOtherStore = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 60) throw new Error("Store name must be 1–60 characters");
    const userId = await requireUserId(ctx);
    const week = await activeWeek(ctx);
    if (!week) throw new Error("Set this week's budget first");
    const known = await ctx.db
      .query("otherStores")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    // Reuse the saved spelling so "sendik's" and "Sendik's" are one store.
    const existing = known.find((s) => s.name.toLowerCase() === trimmed.toLowerCase());
    if (!existing) await ctx.db.insert("otherStores", { userId, name: trimmed });
    await ctx.db.patch(week._id, { otherStore: existing?.name ?? trimmed });
  },
});

/** Non-Kroger stores you've added before. */
export const otherStores = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("otherStores")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});
