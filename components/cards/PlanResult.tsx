"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { adjustPlan, key, mergeIngredients, type PricedPlan, type Product } from "@/lib/meal-plan";
import { fetchPrices } from "@/lib/kroger-client";
import MealPlanCard from "./MealPlanCard";
import BudgetFit from "./BudgetFit";
import PantryChips from "./PantryChips";

// A plan from the crew: remove dinners (re-priced in code, no new lookups), then "Use this plan" → shopping list.
export default function PlanResult({
  priced,
  storeName,
  boxItems,
  initialRemoved = [],
  onRemovedChange,
}: {
  priced: PricedPlan;
  storeName?: string;
  boxItems?: string[];
  initialRemoved?: number[]; // restored from a saved chat
  onRemovedChange: (indexes: number[]) => void;
}) {
  const usePlan = useMutation(api.plans.usePlan);
  const setHave = useMutation(api.pantry.setHave);
  const week = useQuery(api.weeks.latest);
  const router = useRouter();
  const [removed, setRemoved] = useState<ReadonlySet<number>>(new Set(initialRemoved));
  // Staples marked "need it" on this card → the Kroger product found for each.
  const [needed, setNeeded] = useState<ReadonlyMap<string, Product | null>>(new Map());
  const [loading, setLoading] = useState<ReadonlySet<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Original indexes of the dinners still on the card, in order.
  const visible = priced.plan.meals.map((_, i) => i).filter((i) => !removed.has(i));
  const current = useMemo(() => adjustPlan(priced, removed, needed), [priced, removed, needed]);

  // Staples the crew assumed you have (from the original plan, so they stay put after you flip them).
  const staples = mergeIngredients({ meals: priced.plan.meals.filter((_, i) => !removed.has(i)) })
    .filter((i) => i.pantry)
    .map((i) => i.name);
  const neededNames = new Set([...needed.keys()]);

  async function togglePantry(name: string) {
    const k = name.toLowerCase();
    if (needed.has(k)) {
      // Back to "have it": forget the price and remember for next time.
      const next = new Map(needed);
      next.delete(k);
      setNeeded(next);
      await setHave({ name, have: true }).catch(() => {});
      return;
    }
    setLoading((prev) => new Set(prev).add(k));
    const [product] = week?.storeId ? await fetchPrices([{ name }], week.storeId) : [null];
    setNeeded((prev) => new Map(prev).set(k, product ?? null));
    setLoading((prev) => {
      const next = new Set(prev);
      next.delete(k);
      return next;
    });
    await setHave({ name, have: false }).catch(() => {});
  }

  function remove(shownIndex: number) {
    const next = new Set(removed).add(visible[shownIndex]);
    setRemoved(next);
    onRemovedChange([...next]);
  }

  async function use(mode: "replace" | "add") {
    setSaving(true);
    setError(null);
    try {
      await usePlan({
        mode,
        meals: current.meals.map((m, n) => {
          const source = current.plan.meals[n];
          // The products chosen for this dinner's ingredients, so the board can rebuild the list later.
          const chosen = new Map(current.items.map((i) => [key(i.name), i.product]));
          return {
            day: m.day,
            name: m.name,
            estimatedCost: m.cost,
            servings: m.servings,
            recipeId: m.recipeId,
            steps: m.recipeId ? undefined : (source.steps ?? []),
            ingredients: source.ingredients.map(({ name, amount, unit, pantry }) => ({ name, amount, unit, pantry })),
            products: source.ingredients.map((ing) => {
              const p = chosen.get(key(ing.name));
              return {
                name: ing.name,
                product: p
                  ? { productId: p.productId, name: p.name, size: p.size, price: p.price, regularPrice: p.regularPrice, imageUrl: p.imageUrl, snap: p.snap, suggestedPacks: p.suggestedPacks, substitute: p.substitute }
                  : undefined,
              };
            }),
          };
        }),
      });
      router.push("/week");
    } catch {
      setError("Couldn't save the plan. Try again.");
      setSaving(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <MealPlanCard
        plan={current}
        storeName={storeName}
        boxItems={boxItems}
        onRemove={remove}
        pantrySlot={
          <PantryChips
            names={staples}
            needed={neededNames}
            loading={loading}
            onToggle={togglePantry}
          />
        }
      />
      <BudgetFit total={current.total} remaining={current.remaining} fits={current.fits} overBy={current.overBy} />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => use("replace")}
          disabled={saving}
          className="btn-press flex-1"
        >
          {saving ? "Making your list…" : "Use this plan"}
        </button>
        <button
          type="button"
          onClick={() => use("add")}
          disabled={saving}
          className="btn-crate flex-1"
        >
          + Add to this week
        </button>
      </div>
      <p className="text-center text-xs font-bold text-ink-soft">
        &ldquo;Use this plan&rdquo; replaces your current plan · &ldquo;Add&rdquo; keeps it and adds these dinners
      </p>
      {error && <p className="font-bold text-tomato-dark" role="alert">{error}</p>}
    </div>
  );
}
