// Prices a meal plan Claude proposed. Claude describes meals and ingredients; this code does all the money math.
import { z } from "zod";
import { addAmounts, Amount, packagesNeeded, toBase } from "./quantities";
import { estimateTotal } from "./tally";

export const ingredientSchema = z.object({
  name: z.string().min(1).max(80).describe("Grocery item as you'd search a store, e.g. 'chicken thighs', 'canned coconut milk'"),
  amount: z.number().positive().max(1000).describe("How much the recipe needs, e.g. 1.5"),
  unit: z.string().min(1).max(20).describe("lb, oz, g, cup, tbsp, tsp, fl oz, ct, clove, bunch…"),
  pantry: z.boolean().describe("true for staples most kitchens already have: salt, pepper, oil, common spices"),
});

export const planSchema = z.object({
  meals: z
    .array(
      z.object({
        day: z.string().min(1).max(20).describe("e.g. 'Monday' or 'Day 1'"),
        name: z.string().min(1).max(80),
        servings: z.number().min(1).max(12).describe("How many servings the amounts below make"),
        ingredients: z.array(ingredientSchema).min(1).max(20),
      }),
    )
    .min(1)
    .max(14),
});

export type PlanInput = z.infer<typeof planSchema>;
export type Product = { productId: string; name: string; size?: string; price: number; imageUrl?: string; suggestedPacks?: number };

/** Business rules the schema can't express. Returns a message for Claude to fix, or null if fine. */
export function validatePlan(plan: PlanInput, targetServings?: number): string | null {
  const days = new Set(plan.meals.map((m) => m.day.toLowerCase()));
  if (days.size > 7) return "Plan at most 7 days.";
  if (plan.meals.some((m) => m.ingredients.every((i) => i.pantry))) {
    return "Every meal needs at least one ingredient to buy (not just pantry staples).";
  }
  // Half a serving of slack; anything smaller means the family goes hungry.
  const small = targetServings ? plan.meals.filter((m) => m.servings < targetServings - 0.5) : [];
  if (small.length > 0) {
    return `Size every dinner for ${targetServings} servings and scale its amounts to match (too small: ${small
      .map((m) => `${m.name} serves ${m.servings}`)
      .join(", ")}).`;
  }
  return null;
}

export const key = (name: string) => name.trim().toLowerCase();

export type ShoppingItem = {
  name: string;
  amountText: string; // "1.5 lb + 1 lb"
  need: Amount | null;
  pantry: boolean;
  product: Product | null;
  packs: number;
  exact: boolean; // false → "check amount" (units didn't convert)
  cost: number; // cost to buy; 0 for pantry staples and "no price found"
};

/** Same ingredient across meals becomes one item, amounts added before rounding up to packages. */
export function mergeIngredients(plan: PlanInput): Omit<ShoppingItem, "product" | "packs" | "exact" | "cost">[] {
  const merged = new Map<string, { name: string; amounts: string[]; need: Amount | null; pantry: boolean }>();
  for (const meal of plan.meals) {
    for (const ing of meal.ingredients) {
      const need = toBase(ing.amount, ing.unit);
      const prev = merged.get(key(ing.name));
      merged.set(key(ing.name), {
        name: prev?.name ?? ing.name.trim(),
        amounts: [...(prev?.amounts ?? []), `${ing.amount} ${ing.unit}`],
        need: prev ? addAmounts(prev.need, need) : need,
        pantry: (prev?.pantry ?? true) && ing.pantry,
      });
    }
  }
  return [...merged.values()].map(({ name, amounts, need, pantry }) => ({
    name,
    amountText: amounts.join(" + "),
    need,
    pantry,
  }));
}

export type PricedPlan = {
  plan: PlanInput; // the meals as Claude wrote them, so the card can re-price after a meal is removed
  meals: { day: string; name: string; servings: number; cost: number; ingredients: string[] }[];
  items: ShoppingItem[];
  total: number;
  remaining: number;
  fits: boolean;
  overBy: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * products: the Kroger product chosen for each item name (missing/null → "no price found").
 * remaining: budget minus what's already been paid this week.
 */
export function pricePlan(plan: PlanInput, products: Map<string, Product | null>, remaining: number): PricedPlan {
  const items: ShoppingItem[] = mergeIngredients(plan).map((item) => {
    const product = products.get(key(item.name)) ?? null;
    const { packs, exact } = packagesNeeded(item.need, product?.size, product?.suggestedPacks);
    const cost = item.pantry || !product ? 0 : (estimateTotal(product.price, packs) ?? 0);
    return { ...item, product, packs, exact, cost };
  });

  // A meal's cost is its share of each item it uses (by amount when units add up, else split evenly).
  const byKey = new Map(items.map((i) => [key(i.name), i]));
  const usersOf = (name: string) =>
    plan.meals.reduce((n, m) => n + m.ingredients.filter((i) => key(i.name) === key(name)).length, 0);
  const meals = plan.meals.map((meal) => {
    const cost = meal.ingredients.reduce((sum, ing) => {
      const item = byKey.get(key(ing.name))!;
      const mine = toBase(ing.amount, ing.unit);
      const share = item.need && mine && item.need.dim === mine.dim ? mine.base / item.need.base : 1 / usersOf(ing.name);
      return sum + item.cost * share;
    }, 0);
    return {
      day: meal.day,
      name: meal.name,
      servings: meal.servings,
      cost: round2(cost),
      ingredients: meal.ingredients.map((i) => i.name),
    };
  });

  const total = round2(items.reduce((sum, i) => sum + i.cost, 0));
  return { plan, meals, items, total, remaining, fits: total <= remaining, overBy: round2(Math.max(0, total - remaining)) };
}

/** The products already chosen for a priced plan, keyed by item name, for re-pricing without new lookups. */
export function chosenProducts(priced: PricedPlan): Map<string, Product | null> {
  return new Map(priced.items.map((i) => [key(i.name), i.product]));
}

/**
 * Re-prices a plan after edits on the card, without new Kroger or Claude calls:
 * - removed: meal indexes taken off the card
 * - needed: pantry staples Tarik is out of, with the product found for each (null = no price found)
 */
export function adjustPlan(
  priced: PricedPlan,
  removed: ReadonlySet<number>,
  needed: ReadonlyMap<string, Product | null> = new Map(),
): PricedPlan {
  const meals = priced.plan.meals
    .filter((_, i) => !removed.has(i))
    .map((m) => ({
      ...m,
      ingredients: m.ingredients.map((ing) => (needed.has(key(ing.name)) ? { ...ing, pantry: false } : ing)),
    }));
  const products = new Map([...chosenProducts(priced), ...needed]);
  return pricePlan({ meals }, products, priced.remaining);
}

/** Drops meals by index and re-prices with the same products. */
export function removeMeals(priced: PricedPlan, removed: ReadonlySet<number>): PricedPlan {
  return adjustPlan(priced, removed);
}

/** What the proposeMealPlan tool returns to the chat screen. */
export type PlanProgress = { progress: true; done: number; total: number; current?: string; storeName?: string };
export type PlanToolOutput =
  | PlanProgress // in-progress update while pricing; the last update is the plan itself
  | { progress?: false; needsStore: true }
  | ({ progress?: false; needsStore: false; storeName?: string } & PricedPlan);
