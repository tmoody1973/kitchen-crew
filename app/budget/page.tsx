"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { isWeekActive } from "@/lib/tally";
import { DEFAULT_PLAN_LEVEL, PLAN_LABELS, suggestedBudget } from "@/lib/usda";
import HouseholdSettings from "@/components/HouseholdSettings";
import ExtrasSplit from "@/components/ExtrasSplit";

const SUGGESTED = suggestedBudget(DEFAULT_PLAN_LEVEL);

export default function BudgetPage() {
  const week = useQuery(api.weeks.latest);
  if (week === undefined) return null;
  const active = week !== null && isWeekActive(week.startDate, Date.now());
  // key resets the form when the saved budget changes
  return (
    <div className="flex flex-col gap-4">
      <BudgetForm key={week?._id ?? "new"} current={active ? week.budget : undefined} />
      <ExtrasSplit />
      <HouseholdSettings />
    </div>
  );
}

function BudgetForm({ current }: { current?: number }) {
  const setBudget = useMutation(api.weeks.setBudget);
  const router = useRouter();
  const [amount, setAmount] = useState(String(current ?? SUGGESTED));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    const budget = Number(amount);
    if (!Number.isFinite(budget) || budget <= 0) {
      setError("Type a dollar amount above $0.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await setBudget({ budget, planLevel: budget === SUGGESTED ? DEFAULT_PLAN_LEVEL : "custom" });
      router.push("/plan");
    } catch {
      setError("Couldn't save that. Try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="board flex flex-col gap-4 p-5">
      <h1 className="sign text-tag">{current ? "This week's budget" : "Let's set your weekly budget"}</h1>
      <label className="flex flex-col gap-2 font-bold text-chalk-dim">
        Weekly budget
        <span className="flex items-center gap-2 rounded-xl bg-slate-cell px-3 focus-within:shadow-[0_0_0_3px_var(--color-tag)]">
          <span className="font-sign text-3xl text-chalk-dim">$</span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="font-sign w-full bg-transparent py-3 text-4xl text-chalk caret-tag outline-none"
            aria-label="Weekly budget in dollars"
          />
        </span>
      </label>
      <p className="chalk-pill rounded-2xl px-3 py-2 text-sm font-bold">
        Suggested ${SUGGESTED} a week for 2 adults + a 16-year-old, from USDA food-cost data (
        {PLAN_LABELS[DEFAULT_PLAN_LEVEL]} plan, September 2026).
      </p>
      <a href="/plan?ask=budget" className="font-extrabold text-chalk underline">
        Not sure? Ask the crew
      </a>
      {error && <p className="font-bold text-tag">{error}</p>}
      <button
        disabled={saving}
        className="btn-press w-full text-lg"
      >
        {saving ? "Saving…" : current ? "Update budget" : "Start my week"}
      </button>
    </form>
  );
}
