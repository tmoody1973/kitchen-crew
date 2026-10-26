// Demo account snapshot and restore, so every judge sees the same sample week.
// Internal only: run from a terminal with admin access (`npx convex run demo:snapshot` / `demo:restore`);
// the app can't call these.
import { v } from "convex/values";
import { internalMutation, internalQuery, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const PER_USER = ["recipes", "pantry", "household", "regulars", "otherStores"] as const;

async function userState(ctx: QueryCtx, userId: string) {
  const weeks = await ctx.db.query("weeks").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
  const meals = [];
  const listItems = [];
  const receipts = [];
  for (const w of weeks) {
    meals.push(...(await ctx.db.query("meals").withIndex("by_week", (q) => q.eq("weekId", w._id)).collect()));
    listItems.push(...(await ctx.db.query("listItems").withIndex("by_week", (q) => q.eq("weekId", w._id)).collect()));
    receipts.push(...(await ctx.db.query("receipts").withIndex("by_week", (q) => q.eq("weekId", w._id)).collect()));
  }
  const perUser = Object.fromEntries(
    await Promise.all(
      PER_USER.map(async (t) => [t, await ctx.db.query(t).withIndex("by_user", (q) => q.eq("userId", userId)).collect()] as const),
    ),
  ) as unknown as Record<(typeof PER_USER)[number], { _id: string }[]>;
  const chats = await ctx.db.query("chats").withIndex("by_user_updated", (q) => q.eq("userId", userId)).collect();
  return { weeks, meals, listItems, receipts, chats, ...perUser };
}

/** Everything the demo account owns, with ids, for saving to a file. */
export const snapshot = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const { chats: _chats, ...state } = await userState(ctx, userId);
    return state;
  },
});

type Row = Record<string, unknown> & { _id: string; _creationTime: number };
const fields = ({ _id, _creationTime, ...rest }: Row) => rest;

/** Wipes the demo account and puts the snapshot back, re-linking dinners and list rows to their new week and recipe ids. Chats are cleared so the planner opens fresh. */
export const restore = internalMutation({
  args: { userId: v.string(), snapshot: v.any() },
  handler: async (ctx, { userId, snapshot }) => {
    const s = snapshot as Record<string, Row[]>;
    const now = await userState(ctx, userId);
    for (const rows of Object.values(now)) for (const r of rows as { _id: Id<never> }[]) await ctx.db.delete(r._id);

    const weekIds = new Map<string, Id<"weeks">>();
    for (const w of s.weeks) weekIds.set(w._id, await ctx.db.insert("weeks", { ...fields(w), userId } as never));
    const recipeIds = new Map<string, Id<"recipes">>();
    for (const r of s.recipes) recipeIds.set(r._id, await ctx.db.insert("recipes", { ...fields(r), userId } as never));
    for (const m of s.meals) {
      const recipeId = typeof m.recipeId === "string" ? recipeIds.get(m.recipeId) : undefined;
      await ctx.db.insert("meals", { ...fields(m), weekId: weekIds.get(m.weekId as string), recipeId } as never);
    }
    const receiptIds = new Map<string, Id<"receipts">>();
    for (const r of s.receipts ?? []) receiptIds.set(r._id, await ctx.db.insert("receipts", { ...fields(r), userId, weekId: weekIds.get(r.weekId as string) } as never));
    for (const li of s.listItems) {
      const receiptId = typeof li.receiptId === "string" ? receiptIds.get(li.receiptId) : undefined;
      await ctx.db.insert("listItems", { ...fields(li), weekId: weekIds.get(li.weekId as string), receiptId } as never);
    }
    for (const t of ["pantry", "household", "regulars", "otherStores"] as const) {
      for (const r of s[t] ?? []) await ctx.db.insert(t, { ...fields(r), userId } as never);
    }
    return { weeks: s.weeks.length, recipes: s.recipes.length, meals: s.meals.length, listItems: s.listItems.length, receipts: (s.receipts ?? []).length };
  },
});

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Adds 12 labelled sample weeks before the demo's current week, so History's monthly and quarterly
 * views have something to show. Each has a dinner row, an extras row, and a confirmed receipt with tax.
 * Deterministic numbers (no randomness), some weeks over budget. Run once, then re-save the snapshot.
 */
export const seedHistory = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const weeks = await ctx.db.query("weeks").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    if (weeks.some((w) => w.sample)) return { added: 0 };
    const current = weeks.sort((a, b) => b.startDate - a.startDate)[0];
    if (!current) throw new Error("Demo has no week yet");
    // ponytail: fixed pattern of spend (as a share of a $225 budget) instead of random data.
    const shares = [0.86, 0.94, 1.07, 0.81, 0.9, 0.98, 1.12, 0.84, 0.88, 0.95, 0.79, 0.92];
    for (const [k, share] of shares.entries()) {
      const startDate = current.startDate - (k + 1) * WEEK_MS;
      const weekId = await ctx.db.insert("weeks", { userId, budget: 225, extrasBudget: 50, planLevel: "low", startDate, storeId: current.storeId, storeName: current.storeName, sample: true });
      const shelf = Math.round(225 * share * 100) / 100;
      const dinners = Math.round(shelf * 0.74 * 100) / 100;
      const extras = Math.round((shelf - dinners) * 100) / 100;
      const tax = Math.round(extras * 0.056 * 100) / 100; // Wisconsin taxes non-food extras, not most groceries
      const receiptId = await ctx.db.insert("receipts", { userId, weekId, store: "Pick 'n Save", subtotal: shelf, tax, fees: 0, total: Math.round((shelf + tax) * 100) / 100, at: startDate + 2 * 24 * 60 * 60 * 1000, fromPhoto: false });
      const planned = (n: number) => Math.round(n * (k % 3 === 0 ? 1.04 : 0.97) * 100) / 100;
      await ctx.db.insert("listItems", { weekId, name: "Dinner groceries (sample)", estimate: planned(dinners), estimateSource: "manual", paid: dinners, category: "dinner", receiptId });
      await ctx.db.insert("listItems", { weekId, name: "Extras (sample)", estimate: planned(extras), estimateSource: "manual", paid: extras, category: "extra", receiptId });
    }
    return { added: shares.length };
  },
});
