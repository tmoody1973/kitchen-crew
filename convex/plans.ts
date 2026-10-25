import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { activeWeek } from "./weeks";
import { product, productFields } from "./listItems";

/** This week's saved dinners (from the last "Use this plan"). */
export const meals = query({
  args: {},
  handler: async (ctx) => {
    const week = await activeWeek(ctx);
    if (!week) return [];
    return await ctx.db
      .query("meals")
      .withIndex("by_week", (q) => q.eq("weekId", week._id))
      .collect();
  },
});

/**
 * "Use this plan": save the dinners and turn their ingredients into shopping list rows.
 * Replaces the previous plan's dinners and unpaid plan rows; keeps anything you added yourself or already paid for.
 */
export const usePlan = mutation({
  args: {
    meals: v.array(
      v.object({ day: v.string(), name: v.string(), estimatedCost: v.number(), servings: v.optional(v.number()) }),
    ),
    items: v.array(v.object({ name: v.string(), packs: v.number(), product: v.optional(product) })),
  },
  handler: async (ctx, args) => {
    if (args.meals.length === 0 || args.meals.length > 14) throw new Error("A plan needs 1–14 meals");
    if (args.items.length > 100) throw new Error("Too many items");
    const week = await activeWeek(ctx);
    if (!week) throw new Error("Set this week's budget first");

    const oldMeals = await ctx.db.query("meals").withIndex("by_week", (q) => q.eq("weekId", week._id)).collect();
    for (const m of oldMeals) await ctx.db.delete(m._id);

    const listItems = await ctx.db.query("listItems").withIndex("by_week", (q) => q.eq("weekId", week._id)).collect();
    const kept = [];
    for (const item of listItems) {
      if (item.fromPlan && item.paid === undefined) await ctx.db.delete(item._id);
      else kept.push(item);
    }

    for (const m of args.meals) {
      await ctx.db.insert("meals", {
        weekId: week._id,
        day: m.day.slice(0, 20),
        name: m.name.slice(0, 80),
        estimatedCost: Math.max(0, m.estimatedCost),
        servings: m.servings,
      });
    }

    const onList = new Set(kept.map((i) => i.name.trim().toLowerCase()));
    let added = 0;
    for (const item of args.items) {
      const name = item.name.trim().slice(0, 80);
      if (!name || onList.has(name.toLowerCase())) continue; // already on the list: don't double up
      onList.add(name.toLowerCase());
      const packs = Number.isInteger(item.packs) && item.packs >= 1 && item.packs <= 50 ? item.packs : 1;
      await ctx.db.insert("listItems", { weekId: week._id, name, packs, fromPlan: true, ...productFields(item.product) });
      added++;
    }
    return { meals: args.meals.length, added };
  },
});
