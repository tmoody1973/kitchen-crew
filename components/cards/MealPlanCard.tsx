"use client";

import { useState } from "react";
import type { PricedPlan } from "@/lib/meal-plan";
import { formatMoney } from "@/lib/tally";
import { formatServings } from "@/lib/household";
import { BadgePercent, ChevronDown, Repeat2, Store, Users, X } from "lucide-react";

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
    <div className="crate flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="font-sign text-xl">Your dinners</h2>
        {storeName && (
          <span className="flex items-center gap-1 text-xs font-bold text-ink-soft">
            <Store size={13} strokeWidth={2.5} aria-hidden /> {storeName}
          </span>
        )}
      </div>

      <ul className="border-y-2 border-dashed border-line">
        {plan.meals.map((meal, i) => (
          <li key={i} className="row-rule flex items-center gap-3 py-3">
            <span className="font-sign w-12 shrink-0 text-center text-xs leading-tight text-tomato">{meal.day}</span>
            <div className="min-w-0">
              <p className="font-black leading-snug">
                {meal.recipeId ? (
                  <a href={`/recipes/${meal.recipeId}`} className="underline decoration-tag decoration-2 underline-offset-2">
                    {meal.name}
                  </a>
                ) : (
                  meal.name
                )}
              </p>
              <p className="flex items-center gap-1 text-xs font-bold text-ink-soft">
                <Users size={12} strokeWidth={2.5} aria-hidden /> serves {formatServings(meal.servings)}
              </p>
            </div>
            <span className="tag ml-auto shrink-0 text-sm">~{formatMoney(meal.cost)}</span>
            {onRemove && plan.meals.length > 1 && (
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-line"
                aria-label={`Remove ${meal.name}`}
              >
                <X size={18} strokeWidth={3} aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between border-t-2 border-line pt-3">
        <span className="font-black">Shopping total</span>
        <span className="tag text-lg">{formatMoney(plan.total)}</span>
      </div>
      {(plan.savings ?? 0) > 0 && (
        <p className="-mt-1 flex items-center gap-1 text-sm font-extrabold text-kale-ink">
          <BadgePercent size={16} strokeWidth={2.75} aria-hidden />
          Includes {formatMoney(plan.savings)} in Kroger sales{storeName ? ` at ${storeName.split(" · ")[0]}` : ""}
        </p>
      )}
      <p className="-mt-1 text-xs font-bold text-ink-soft">
        Kroger&apos;s current prices{storeName ? ` at ${storeName.split(" · ")[0]}` : ""}, for whole packages. The register can differ; the tally uses what you actually pay.
      </p>

      <button
        type="button"
        onClick={() => setShowItems(!showItems)}
        aria-expanded={showItems}
        className="flex items-center gap-1 self-start text-sm font-extrabold underline"
      >
        {showItems ? "Hide" : "Show"} what to buy ({toBuy.length} items)
        <ChevronDown size={16} strokeWidth={3} className={showItems ? "rotate-180" : ""} aria-hidden />
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
                  {item.name} <span className="text-ink-soft">· needs {item.amountText}</span>
                </p>
                {item.product?.substitute && (
                  <p className="flex items-center gap-1 text-xs font-extrabold text-ink">
                    <Repeat2 size={13} strokeWidth={2.75} aria-hidden /> swap: {item.product.substitute} (no match at this store)
                  </p>
                )}
                <p className="text-xs text-ink-soft">
                  {item.product
                    ? `${item.product.name}${item.product.size ? ` · ${item.product.size}` : ""} · ${item.packs} × ${formatMoney(item.product.price)}`
                    : "No price found"}
                  {item.product && !item.exact && " · check amount"}
                </p>
                {item.product?.regularPrice && (item.saved ?? 0) > 0 && (
                  <p className="text-xs font-extrabold text-kale-ink">
                    On sale · was {formatMoney(item.product.regularPrice)} · save {formatMoney(item.saved)}
                  </p>
                )}
              </div>
              <span className="shrink-0 font-black">{item.product ? formatMoney(item.cost) : "—"}</span>
            </li>
          ))}
          {!pantrySlot && pantry.length > 0 && (
            <li className="text-xs font-bold text-ink-soft">
              Probably in your pantry (not counted): {pantry.map((p) => p.name).join(", ")}
            </li>
          )}
        </ul>
      )}

      {pantrySlot}
    </div>
  );
}
