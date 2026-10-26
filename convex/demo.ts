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
  for (const w of weeks) {
    meals.push(...(await ctx.db.query("meals").withIndex("by_week", (q) => q.eq("weekId", w._id)).collect()));
    listItems.push(...(await ctx.db.query("listItems").withIndex("by_week", (q) => q.eq("weekId", w._id)).collect()));
  }
  const perUser = Object.fromEntries(
    await Promise.all(
      PER_USER.map(async (t) => [t, await ctx.db.query(t).withIndex("by_user", (q) => q.eq("userId", userId)).collect()] as const),
    ),
  ) as unknown as Record<(typeof PER_USER)[number], { _id: string }[]>;
  const chats = await ctx.db.query("chats").withIndex("by_user_updated", (q) => q.eq("userId", userId)).collect();
  return { weeks, meals, listItems, chats, ...perUser };
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
    for (const li of s.listItems) await ctx.db.insert("listItems", { ...fields(li), weekId: weekIds.get(li.weekId as string) } as never);
    for (const t of ["pantry", "household", "regulars", "otherStores"] as const) {
      for (const r of s[t] ?? []) await ctx.db.insert(t, { ...fields(r), userId } as never);
    }
    return { weeks: s.weeks.length, recipes: s.recipes.length, meals: s.meals.length, listItems: s.listItems.length };
  },
});
