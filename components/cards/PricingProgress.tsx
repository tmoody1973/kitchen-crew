import { ChefHat, Repeat2, ShoppingCart } from "lucide-react";
import type { PlanProgress } from "@/lib/meal-plan";

// "Pricing at Metro Market: 12 of 28 · chicken thighs" with a chalk bar that fills as each item is looked up.
export default function PricingProgress({ done, total, current, storeName }: Omit<PlanProgress, "progress">) {
  const picking = total > 0 && done >= total;
  // Searches fill the bar to 90%; the last 10% is Claude picking the best matches.
  const pct = total === 0 ? 5 : Math.round((done / total) * 90) + (picking ? 5 : 0);
  const Icon = picking ? (current ? Repeat2 : ChefHat) : ShoppingCart;
  const label = picking
    ? current
      ? `Finding ${current}…`
      : "Picking the best matches…"
    : `Pricing at ${storeName ?? "your store"}: ${done + 1} of ${total}`;
  return (
    <div className="board flex w-full flex-col gap-2 p-4" role="status" aria-live="polite">
      <p className="flex items-center gap-2 font-extrabold">
        <Icon size={18} strokeWidth={2.5} className="text-tag" aria-hidden />
        {label}
      </p>
      <div className="h-3.5 overflow-hidden rounded-full bg-slate-cell" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className="h-full rounded-full bg-tag transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
      </div>
      {!picking && current && <p className="text-sm font-bold text-chalk-dim">Looking up {current}…</p>}
    </div>
  );
}
