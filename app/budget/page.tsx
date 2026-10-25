"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { isWeekActive } from "@/lib/tally";
import { DEFAULT_PLAN_LEVEL, PLAN_LABELS, suggestedBudget } from "@/lib/usda";
import HouseholdSettings from "@/components/HouseholdSettings";

const SUGGESTED = suggestedBudget(DEFAULT_PLAN_LEVEL);

export default function BudgetPage() {
  const week = useQuery(api.weeks.latest);
  if (week === undefined) return null;
  const active = week !== null && isWeekActive(week.startDate, Date.now());
  // key resets the form when the saved budget changes
  return (
    <div className="flex flex-col gap-4">
      <BudgetForm key={week?._id ?? "new"} current={active ? week.budget : undefined} />
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
    <form onSubmit={save} className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-black">{current ? "This week's budget" : "Let's set your weekly budget"}</h1>
      <p className="rounded-xl bg-leaf/10 p-3 font-bold text-leaf-dark">
        Suggested: ${SUGGESTED}/week for 2 adults + a 16-year-old, based on USDA food-cost data (
        {PLAN_LABELS[DEFAULT_PLAN_LEVEL]} plan, September 2026).
      </p>
      <label className="flex flex-col gap-1 font-bold">
        Weekly budget
        <span className="flex items-center gap-2 rounded-xl border-2 border-slate-200 px-3 focus-within:border-leaf">
          <span className="text-2xl font-black text-slate-400">$</span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full py-3 text-2xl font-black outline-none"
            aria-label="Weekly budget in dollars"
          />
        </span>
      </label>
      <a href="/plan?ask=budget" className="text-center font-bold text-leaf-dark underline">
        Not sure? Let the crew help you figure it out →
      </a>
      {error && <p className="font-bold text-carrot-dark">{error}</p>}
      <button
        disabled={saving}
        className="rounded-2xl border-b-4 border-leaf-dark bg-leaf py-3 text-lg font-black text-white active:translate-y-0.5 active:border-b-2 disabled:opacity-60"
      >
        {saving ? "Saving…" : current ? "Update budget" : "Start my week"}
      </button>
    </form>
  );
}
