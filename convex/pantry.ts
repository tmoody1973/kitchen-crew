import { v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";
import { requireUserId } from "./weeks";

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
