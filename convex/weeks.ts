import { v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";
import { isWeekActive } from "../lib/tally";

const planLevel = v.union(v.literal("thrifty"), v.literal("low"), v.literal("moderate"), v.literal("custom"));

async function requireUserId(ctx: QueryCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not signed in");
  return identity.subject;
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
    const current = await ctx.db
      .query("weeks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .first();

    const now = Date.now();
    if (current && isWeekActive(current.startDate, now)) {
      await ctx.db.patch(current._id, { budget, planLevel });
      return current._id;
    }
    return await ctx.db.insert("weeks", { userId, budget, planLevel, startDate: now });
  },
});
