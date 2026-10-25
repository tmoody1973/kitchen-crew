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
    <div className="board flex w-full flex-col gap-3 p-4">
      <p className="font-bold text-chalk-dim">Suggested weekly budget</p>
      <p className="font-sign text-4xl leading-none">{formatMoney(pick.amount)}</p>
      <p className="font-bold">{suggestion.reason}</p>
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
            className={`chalk-pill text-sm font-extrabold ${l.level === chosen ? "border-solid border-tag bg-tag text-ink" : "text-chalk"}`}
          >
            {l.label} · {formatMoney(l.amount)}
          </button>
        ))}
      </div>
      <p className="text-xs font-bold text-chalk-dim">
        USDA food-cost data, September 2026, for 2 adults + a 16-year-old.
      </p>
      <button
        type="button"
        onClick={use}
        disabled={saved}
        className="btn-press w-full"
      >
        {saved ? "Saved — it's on the board" : `Use ${formatMoney(pick.amount)} a week`}
      </button>
      {error && <p className="font-bold text-tag">{error}</p>}
    </div>
  );
}
