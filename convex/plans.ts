import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { activeWeek, product, productFields } from "./model";
import { saveRecipe } from "./recipes";

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
 * mode "replace": replaces the previous plan's dinners and unpaid plan rows (keeps your own and paid items).
 * mode "add": keeps everything and adds this plan's dinners; an ingredient already on the list gets more packs.
 */
export const usePlan = mutation({
  args: {
    mode: v.optional(v.union(v.literal("replace"), v.literal("add"))),
    meals: v.array(
      v.object({
        day: v.string(),
        name: v.string(),
        estimatedCost: v.number(),
        servings: v.optional(v.number()),
        recipeId: v.optional(v.string()), // a saved recipe this dinner uses
        // The crew's own dinner, saved to My Recipes so it has a recipe view.
        crewRecipe: v.optional(
          v.object({
            ingredients: v.array(v.object({ name: v.string(), amount: v.number(), unit: v.string(), pantry: v.boolean() })),
            steps: v.array(v.string()),
          }),
        ),
      }),
    ),
    items: v.array(v.object({ name: v.string(), packs: v.number(), product: v.optional(product) })),
  },
  handler: async (ctx, args) => {
    if (args.meals.length === 0 || args.meals.length > 14) throw new Error("A plan needs 1–14 meals");
    if (args.items.length > 100) throw new Error("Too many items");
    const week = await activeWeek(ctx);
    if (!week) throw new Error("Set this week's budget first");

    const adding = args.mode === "add";
    if (!adding) {
      const oldMeals = await ctx.db.query("meals").withIndex("by_week", (q) => q.eq("weekId", week._id)).collect();
      for (const m of oldMeals) await ctx.db.delete(m._id);
    }

    const listItems = await ctx.db.query("listItems").withIndex("by_week", (q) => q.eq("weekId", week._id)).collect();
    const kept = [];
    for (const item of listItems) {
      if (!adding && item.fromPlan && item.paid === undefined) await ctx.db.delete(item._id);
      else kept.push(item);
    }

    for (const m of args.meals) {
      let recipeId = m.recipeId ? ctx.db.normalizeId("recipes", m.recipeId) : null;
      if (recipeId && (await ctx.db.get(recipeId))?.userId !== week.userId) recipeId = null;
      if (!recipeId && m.crewRecipe && m.crewRecipe.ingredients.length > 0) {
        recipeId = await saveRecipe(ctx, week.userId, {
          title: m.name,
          sourceType: "crew",
          sourceName: "Kitchen Crew",
          servings: m.servings ?? 3.5,
          ingredients: m.crewRecipe.ingredients.map((i) => ({ ...i, raw: `${i.amount} ${i.unit} ${i.name}` })),
          steps: m.crewRecipe.steps,
        });
      }
      await ctx.db.insert("meals", {
        weekId: week._id,
        day: m.day.slice(0, 20),
        name: m.name.slice(0, 80),
        estimatedCost: Math.max(0, m.estimatedCost),
        servings: m.servings,
        recipeId: recipeId ?? undefined,
      });
    }

    const onList = new Map(kept.map((i) => [i.name.trim().toLowerCase(), i]));
    let added = 0;
    for (const item of args.items) {
      const name = item.name.trim().slice(0, 80);
      if (!name) continue;
      const packs = Number.isInteger(item.packs) && item.packs >= 1 && item.packs <= 50 ? item.packs : 1;
      const existing = onList.get(name.toLowerCase());
      if (existing) {
        // Adding a second plan that also needs it: buy more, unless it's already been paid for.
        if (adding && existing.paid === undefined) {
          await ctx.db.patch(existing._id, { packs: Math.min(50, (existing.packs ?? 1) + packs) });
        }
        continue; // never a duplicate row
      }
      const id = await ctx.db.insert("listItems", {
        weekId: week._id,
        name,
        packs,
        fromPlan: true,
        category: "dinner",
        ...productFields(item.product),
      });
      onList.set(name.toLowerCase(), (await ctx.db.get(id))!);
      added++;
    }
    return { meals: args.meals.length, added };
  },
});
