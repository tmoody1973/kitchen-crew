import type { PlanProgress } from "@/lib/meal-plan";

// "Pricing at Metro Market: 12 of 28 · chicken thighs" with a bar that fills as each item is looked up.
export default function PricingProgress({ done, total, current, storeName }: Omit<PlanProgress, "progress">) {
  const picking = total > 0 && done >= total;
  // Searches fill the bar to 90%; the last 10% is Claude picking the best matches.
  const pct = total === 0 ? 5 : Math.round((done / total) * 90) + (picking ? 5 : 0);
  return (
    <div className="flex w-full flex-col gap-2 rounded-2xl bg-white p-4" role="status" aria-live="polite">
      <p className="font-black">
        {picking
          ? current
            ? `🔁 Finding ${current}…`
            : "🧑‍🍳 Picking the best matches…"
          : `🛒 Pricing at ${storeName ?? "your store"}: ${done + 1} of ${total}`}
      </p>
      <div
        className="h-4 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div className="h-full rounded-full bg-leaf transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
      {!picking && current && <p className="text-sm font-bold text-slate-500">Looking up {current}…</p>}
    </div>
  );
}
