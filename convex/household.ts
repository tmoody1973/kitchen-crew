import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./model";
import { DEFAULT_HOUSEHOLD, servingsFor } from "../lib/household";

/** Your household meal size, or the default (3½ servings, no leftovers). */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db
      .query("household")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    // onboarded: false only for a brand-new account (no household row yet), which the first screen sends to /welcome.
    return row
      ? { servings: row.servings, leftovers: row.leftovers, autoRegulars: row.autoRegulars ?? false, name: row.name, members: row.members, onboarded: true }
      : { ...DEFAULT_HOUSEHOLD, autoRegulars: false, name: undefined, members: undefined, onboarded: false };
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

const count = v.number();

/** First sign-in: what the crew calls you and who eats at home; dinner servings follow from the people. */
export const onboard = mutation({
  args: {
    name: v.string(),
    members: v.object({ men: count, women: count, teenBoys: count, teenGirls: count, kids: count, littleKids: count }),
    leftovers: v.boolean(),
  },
  handler: async (ctx, { name, members, leftovers }) => {
    const counts = Object.values(members);
    if (counts.some((n) => !Number.isInteger(n) || n < 0 || n > 12) || counts.reduce((a, b) => a + b, 0) < 1) {
      throw new Error("Add at least one person (up to 12 in each group)");
    }
    const userId = await requireUserId(ctx);
    const fields = { name: name.trim().slice(0, 40) || undefined, members, leftovers, servings: servingsFor(members) };
    const row = await ctx.db.query("household").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    if (row) await ctx.db.patch(row._id, fields);
    else await ctx.db.insert("household", { userId, ...fields });
  },
});
