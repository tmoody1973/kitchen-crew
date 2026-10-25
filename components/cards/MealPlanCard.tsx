"use client";

import { useState } from "react";
import type { PricedPlan } from "@/lib/meal-plan";
import { formatMoney } from "@/lib/tally";
import { formatServings } from "@/lib/household";

// Claude chose the meals; code priced them. This card just draws the data.
export default function MealPlanCard({
  plan,
  storeName,
  onRemove,
  pantrySlot,
}: {
  plan: PricedPlan;
  storeName?: string;
  onRemove?: (mealIndex: number) => void; // index into plan.meals as shown
  pantrySlot?: React.ReactNode; // pantry chips, drawn by the parent
}) {
  const [showItems, setShowItems] = useState(false);
  const toBuy = plan.items.filter((i) => !i.pantry);
  const pantry = plan.items.filter((i) => i.pantry);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 border-slate-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-black">Your meal plan</h2>
        <span className="text-sm font-bold text-slate-500">{storeName}</span>
      </div>

      <ul className="flex flex-col gap-2">
        {plan.meals.map((meal, i) => (
          <li key={i} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-leaf-dark">{meal.day}</p>
              <p className="font-black">{meal.name}</p>
              <p className="text-xs font-bold text-slate-500">serves {formatServings(meal.servings)}</p>
            </div>
            <span className="ml-auto shrink-0 font-black">~{formatMoney(meal.cost)}</span>
            {onRemove && plan.meals.length > 1 && (
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="h-9 w-9 shrink-0 rounded-full font-black text-slate-400 hover:bg-slate-200"
                aria-label={`Remove ${meal.name}`}
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between border-t-2 border-slate-100 pt-3 font-black">
        <span>Shopping total</span>
        <span>{formatMoney(plan.total)}</span>
      </div>

      <button type="button" onClick={() => setShowItems(!showItems)} className="self-start text-sm font-bold text-leaf-dark underline">
        {showItems ? "Hide" : "Show"} what to buy ({toBuy.length} items)
      </button>

      {showItems && (
        <ul className="flex flex-col gap-2 text-sm">
          {toBuy.map((item) => (
            <li key={item.name} className="flex items-center gap-3">
              {item.product?.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- tiny Kroger thumbnail
                <img src={item.product.imageUrl} alt="" width={36} height={36} className="h-9 w-9 shrink-0 object-contain" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold">
                  {item.name} <span className="text-slate-500">· needs {item.amountText}</span>
                </p>
                <p className="text-xs text-slate-500">
                  {item.product
                    ? `${item.product.name}${item.product.size ? ` · ${item.product.size}` : ""} · ${item.packs} × ${formatMoney(item.product.price)}`
                    : "No price found"}
                  {item.product && !item.exact && " · check amount"}
                </p>
              </div>
              <span className="shrink-0 font-black">{item.product ? formatMoney(item.cost) : "—"}</span>
            </li>
          ))}
          {!pantrySlot && pantry.length > 0 && (
            <li className="text-xs font-bold text-slate-500">
              Probably in your pantry (not counted): {pantry.map((p) => p.name).join(", ")}
            </li>
          )}
        </ul>
      )}

      {pantrySlot}
    </div>
  );
}
