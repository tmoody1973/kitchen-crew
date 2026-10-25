import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./weeks";
import { DEFAULT_HOUSEHOLD } from "../lib/household";

/** Your household meal size, or the default (3½ servings, no leftovers). */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db
      .query("household")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return row ? { servings: row.servings, leftovers: row.leftovers } : DEFAULT_HOUSEHOLD;
  },
});

export const save = mutation({
  args: { servings: v.number(), leftovers: v.boolean() },
  handler: async (ctx, { servings, leftovers }) => {
    // Half-servings only, 1–12.
    if (!Number.isFinite(servings) || servings < 1 || servings > 12 || (servings * 2) % 1 !== 0) {
      throw new Error("Servings must be 1–12, in halves");
    }
    const userId = await requireUserId(ctx);
    const row = await ctx.db
      .query("household")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (row) await ctx.db.patch(row._id, { servings, leftovers });
    else await ctx.db.insert("household", { userId, servings, leftovers });
  },
});
