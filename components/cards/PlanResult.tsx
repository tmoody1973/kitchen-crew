"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { adjustPlan, mergeIngredients, type PricedPlan, type Product } from "@/lib/meal-plan";
import { fetchPrices } from "@/lib/kroger-client";
import MealPlanCard from "./MealPlanCard";
import BudgetFit from "./BudgetFit";
import PantryChips from "./PantryChips";

// A plan from the crew: remove dinners (re-priced in code, no new lookups), then "Use this plan" → shopping list.
export default function PlanResult({
  priced,
  storeName,
  onMealsRemoved,
}: {
  priced: PricedPlan;
  storeName?: string;
  onMealsRemoved: (names: string[]) => void;
}) {
  const usePlan = useMutation(api.plans.usePlan);
  const setHave = useMutation(api.pantry.setHave);
  const week = useQuery(api.weeks.latest);
  const router = useRouter();
  const [removed, setRemoved] = useState<ReadonlySet<number>>(new Set());
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
    onMealsRemoved([...next].map((i) => `${priced.plan.meals[i].day}: ${priced.plan.meals[i].name}`));
  }

  async function use() {
    setSaving(true);
    setError(null);
    try {
      await usePlan({
        meals: current.meals.map((m) => ({ day: m.day, name: m.name, estimatedCost: m.cost, servings: m.servings })),
        items: current.items
          .filter((i) => !i.pantry)
          .map((i) => ({
            name: i.name,
            packs: i.packs,
            // Only the fields the database stores (drop the picker's suggestion).
            product: i.product
              ? { productId: i.product.productId, name: i.product.name, size: i.product.size, price: i.product.price, imageUrl: i.product.imageUrl }
              : undefined,
          })),
      });
      router.push("/list");
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
      <button
        type="button"
        onClick={use}
        disabled={saving}
        className="rounded-2xl border-b-4 border-leaf-dark bg-leaf py-3 text-lg font-black text-white active:translate-y-0.5 active:border-b-2 disabled:opacity-60"
      >
        {saving ? "Making your list…" : "Use this plan → shopping list"}
      </button>
      {error && <p className="font-bold text-carrot-dark">{error}</p>}
    </div>
  );
}
