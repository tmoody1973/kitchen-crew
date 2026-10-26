import { v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";
import { requireUserId } from "./model";

const clean = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

async function entries(ctx: QueryCtx, userId: string) {
  return await ctx.db
    .query("pantry")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
}

/** Everything in your pantry list, alphabetical. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return (await entries(ctx, userId)).sort((a, b) => a.name.localeCompare(b.name));
  },
});

/** Mark an item as "have it" or "out"; adds it to the pantry list if new. */
export const setHave = mutation({
  args: { name: v.string(), have: v.boolean() },
  handler: async (ctx, { name, have }) => {
    const n = clean(name);
    if (!n || n.length > 60) throw new Error("Pantry item must be 1–60 characters");
    const userId = await requireUserId(ctx);
    const existing = (await entries(ctx, userId)).find((e) => e.name === n);
    if (existing) await ctx.db.patch(existing._id, { have });
    else await ctx.db.insert("pantry", { userId, name: n, have });
  },
});

export const remove = mutation({
  args: { id: v.id("pantry") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const item = await ctx.db.get(id);
    if (!item || item.userId !== userId) throw new Error("Item not found");
    await ctx.db.delete(id);
  },
});

/**
 * "Add my food box": every item joins the pantry as have-it, marked from the box, with counts
 * (adding to any count already there).
 */
export const addBox = mutation({
  args: { items: v.array(v.object({ name: v.string(), qty: v.number() })) },
  handler: async (ctx, { items }) => {
    if (items.length === 0 || items.length > 60) throw new Error("Add 1–60 items");
    const userId = await requireUserId(ctx);
    const existing = await entries(ctx, userId);
    let added = 0;
    for (const it of items) {
      const n = clean(it.name);
      const qty = Math.max(1, Math.min(99, Math.round(it.qty)));
      if (!n || n.length > 60 || !Number.isFinite(qty)) continue;
      const row = existing.find((e) => e.name === n);
      if (row) await ctx.db.patch(row._id, { have: true, fromBox: true, qty: (row.qty ?? 0) + qty });
      else await ctx.db.insert("pantry", { userId, name: n, have: true, fromBox: true, qty });
      added++;
    }
    return added;
  },
});

/** Clears the "from the box" mark (and count) from everything, e.g. once the box is used up. */
export const clearBox = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    for (const e of await entries(ctx, userId)) if (e.fromBox) await ctx.db.patch(e._id, { fromBox: undefined, qty: undefined });
  },
});
