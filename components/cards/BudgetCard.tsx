"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { PlanLevel } from "@/lib/usda";
import { formatMoney } from "@/lib/tally";

export type BudgetSuggestion = {
  recommended: PlanLevel;
  reason: string;
  levels: { level: PlanLevel; label: string; amount: number }[];
};

// The crew's budget suggestion (USDA numbers from code, level chosen by Claude), with a Use button.
export default function BudgetCard({ suggestion }: { suggestion: BudgetSuggestion }) {
  const setBudget = useMutation(api.weeks.setBudget);
  const [chosen, setChosen] = useState<PlanLevel>(suggestion.recommended);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pick = suggestion.levels.find((l) => l.level === chosen)!;

  async function use() {
    setError(null);
    try {
      await setBudget({ budget: pick.amount, planLevel: pick.level });
      setSaved(true);
    } catch {
      setError("Couldn't save that. Try again.");
    }
  }

  return (
    <div className="flex w-full flex-col gap-3 rounded-2xl border-2 border-slate-200 bg-white p-4">
      <p className="text-sm font-black uppercase tracking-wide text-leaf-dark">Suggested weekly budget</p>
      <p className="text-4xl font-black">{formatMoney(pick.amount)}</p>
      <p className="font-bold text-slate-600">{suggestion.reason}</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="USDA plan level">
        {suggestion.levels.map((l) => (
          <button
            key={l.level}
            type="button"
            role="radio"
            aria-checked={l.level === chosen}
            onClick={() => {
              setChosen(l.level);
              setSaved(false);
            }}
            className={`rounded-xl border-2 px-3 py-2 text-sm font-bold ${l.level === chosen ? "border-leaf bg-leaf/10" : "border-slate-200"}`}
          >
            {l.label} · {formatMoney(l.amount)}
          </button>
        ))}
      </div>
      <p className="text-xs font-bold text-slate-500">
        USDA food-cost data, September 2026, for 2 adults + a 16-year-old.
      </p>
      <button
        type="button"
        onClick={use}
        disabled={saved}
        className="rounded-2xl border-b-4 border-leaf-dark bg-leaf py-3 font-black text-white disabled:opacity-70"
      >
        {saved ? "Saved ✓" : `Use ${formatMoney(pick.amount)}/week`}
      </button>
      {error && <p className="font-bold text-carrot-dark">{error}</p>}
    </div>
  );
}
