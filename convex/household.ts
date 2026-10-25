import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./model";
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
    return row
      ? { servings: row.servings, leftovers: row.leftovers, autoRegulars: row.autoRegulars ?? false }
      : { ...DEFAULT_HOUSEHOLD, autoRegulars: false };
  },
});

export const save = mutation({
  args: { servings: v.number(), leftovers: v.boolean(), autoRegulars: v.optional(v.boolean()) },
  handler: async (ctx, { servings, leftovers, autoRegulars }) => {
    // Half-servings only, 1–12.
    if (!Number.isFinite(servings) || servings < 1 || servings > 12 || (servings * 2) % 1 !== 0) {
      throw new Error("Servings must be 1–12, in halves");
    }
    const userId = await requireUserId(ctx);
    const row = await ctx.db
      .query("household")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    const fields = { servings, leftovers, ...(autoRegulars === undefined ? {} : { autoRegulars }) };
    if (row) await ctx.db.patch(row._id, fields);
    else await ctx.db.insert("household", { userId, ...fields });
  },
});
