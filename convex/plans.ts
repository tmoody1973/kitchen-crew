import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { activeWeek, ensureNextWeek, ownWeek, rebuildWeek, weekForOffset } from "./model";
import { saveRecipe } from "./recipes";
import { openDays } from "../lib/weeks";

const ingredient = v.object({ name: v.string(), amount: v.number(), unit: v.string(), pantry: v.boolean() });
const storedProduct = v.object({
  productId: v.string(),
  name: v.string(),
  size: v.optional(v.string()),
  price: v.number(),
  imageUrl: v.optional(v.string()),
  suggestedPacks: v.optional(v.number()),
  substitute: v.optional(v.string()),
});

/** Dinners on a week's board: this week (offset 0) or next week (offset 1). Ideas have no dayIndex. */
export const meals = query({
  args: { offset: v.optional(v.number()) },
  handler: async (ctx, { offset }) => {
    const week = await weekForOffset(ctx, offset ?? 0);
    if (!week) return [];
    return await ctx.db
      .query("meals")
      .withIndex("by_week", (q) => q.eq("weekId", week._id))
      .collect();
  },
});

/**
 * "Use this plan" / "Add to this week": put the dinners on this week's board, first open day onward
 * (anything that doesn't fit becomes an Idea), save each dinner's ingredients and products, and rebuild the list.
 * mode "replace" clears this week's scheduled dinners (and older plan rows) first; "add" keeps them.
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
        recipeId: v.optional(v.string()),
        ingredients: v.array(ingredient),
        products: v.array(v.object({ name: v.string(), product: v.optional(storedProduct) })),
        steps: v.optional(v.array(v.string())), // the crew's own dinners get saved to My Recipes
      }),
    ),
  },
  handler: async (ctx, args) => {
    if (args.meals.length === 0 || args.meals.length > 14) throw new Error("A plan needs 1–14 meals");
    const week = await activeWeek(ctx);
    if (!week) throw new Error("Set this week's budget first");

    const existing = await ctx.db.query("meals").withIndex("by_week", (q) => q.eq("weekId", week._id)).collect();
    if (args.mode !== "add") {
      for (const m of existing) if (m.dayIndex !== undefined || m.ingredients === undefined) await ctx.db.delete(m._id);
      // Rows from plans made before the board existed are replaced too (unpaid only).
      const rows = await ctx.db.query("listItems").withIndex("by_week", (q) => q.eq("weekId", week._id)).collect();
      for (const r of rows) if (r.fromPlan && !r.fromBoard && r.paid === undefined) await ctx.db.delete(r._id);
    }
    const taken = new Set(
      (args.mode === "add" ? existing : []).flatMap((m) => (m.dayIndex === undefined ? [] : [m.dayIndex])),
    );
    const days = openDays(week.startDate, Date.now(), taken);
    const planId = `plan-${Date.now().toString(36)}`; // groups these dinners as one plan on the List

    for (const [n, m] of args.meals.entries()) {
      let recipeId = m.recipeId ? ctx.db.normalizeId("recipes", m.recipeId) : null;
      if (recipeId && (await ctx.db.get(recipeId))?.userId !== week.userId) recipeId = null;
      if (!recipeId && m.ingredients.length > 0 && m.steps) {
        recipeId = await saveRecipe(ctx, week.userId, {
          title: m.name,
          sourceType: "crew",
          sourceName: "Mise crew",
          servings: m.servings ?? 3.5,
          ingredients: m.ingredients.map((i) => ({ ...i, raw: `${i.amount} ${i.unit} ${i.name}` })),
          steps: m.steps,
        });
      }
      await ctx.db.insert("meals", {
        weekId: week._id,
        day: m.day.slice(0, 20),
        name: m.name.slice(0, 80),
        estimatedCost: Math.max(0, m.estimatedCost),
        servings: m.servings,
        recipeId: recipeId ?? undefined,
        dayIndex: days[n], // undefined when the week is full → an Idea
        planId,
        ingredients: m.ingredients.slice(0, 40).map((i) => ({ ...i, name: i.name.slice(0, 80), unit: i.unit.slice(0, 20) })),
        products: m.products.slice(0, 40),
      });
    }
    await rebuildWeek(ctx, week._id);
    return { meals: args.meals.length, scheduled: Math.min(args.meals.length, days.length) };
  },
});

/** Move a dinner to a day this week (offset 0) or next week (offset 1, created if needed), or to Ideas (dayIndex null). */
export const moveMeal = mutation({
  args: { id: v.id("meals"), offset: v.number(), dayIndex: v.union(v.number(), v.null()) },
  handler: async (ctx, { id, offset, dayIndex }) => {
    const meal = await ctx.db.get(id);
    if (!meal) throw new Error("Dinner not found");
    await ownWeek(ctx, meal.weekId);
    if (dayIndex !== null && (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex > 6)) throw new Error("Day must be 0–6");
    const target = offset === 1 ? await ensureNextWeek(ctx) : await activeWeek(ctx);
    if (!target) throw new Error("Set this week's budget first");
    const fromWeek: Id<"weeks"> = meal.weekId;
    await ctx.db.patch(id, { weekId: target._id, dayIndex: dayIndex ?? undefined });
    await rebuildWeek(ctx, target._id);
    if (fromWeek !== target._id) await rebuildWeek(ctx, fromWeek);
  },
});

/** Take a dinner off the board (its unpaid ingredients leave the list). */
export const removeMeal = mutation({
  args: { id: v.id("meals") },
  handler: async (ctx, { id }) => {
    const meal = await ctx.db.get(id);
    if (!meal) throw new Error("Dinner not found");
    await ownWeek(ctx, meal.weekId);
    await ctx.db.delete(id);
    await rebuildWeek(ctx, meal.weekId);
  },
});
