"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { isWeekActive } from "@/lib/tally";
import { DEFAULT_MEMBERS, DEFAULT_PLAN_LEVEL, PLAN_LABELS, suggestedBudget } from "@/lib/usda";
import { describeHousehold } from "@/lib/household";
import HouseholdSettings from "@/components/HouseholdSettings";
import ExtrasSplit from "@/components/ExtrasSplit";


export default function BudgetPage() {
  const week = useQuery(api.weeks.latest);
  const household = useQuery(api.household.mine);
  if (week === undefined || household === undefined) return null;
  const members = household.members ?? DEFAULT_MEMBERS;
  const suggested = suggestedBudget(DEFAULT_PLAN_LEVEL, members);
  const active = week !== null && isWeekActive(week.startDate, Date.now());
  // key resets the form when the saved budget changes
  return (
    // Laptop: budget and its split on the left, household on the right. Phone: stacked in the same order.
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
      <div className="flex flex-col gap-4">
        <BudgetForm key={week?._id ?? "new"} current={active ? week.budget : undefined} suggested={suggested} who={describeHousehold(members)} />
        <ExtrasSplit />
        <Link href="/history" className="crate flex items-center justify-between gap-2 p-4 font-black hover:border-ink">
          Spending history: weekly, monthly, quarterly
          <ArrowRight size={18} strokeWidth={3} aria-hidden />
        </Link>
      </div>
      <HouseholdSettings />
    </div>
  );
}

function BudgetForm({ current, suggested, who }: { current?: number; suggested: number; who: string }) {
  const setBudget = useMutation(api.weeks.setBudget);
  const router = useRouter();
  const [amount, setAmount] = useState(String(current ?? suggested));
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
      await setBudget({ budget, planLevel: budget === suggested ? DEFAULT_PLAN_LEVEL : "custom" });
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
        Suggested ${suggested} a week for {who.replace(/ \(.*?\)/g, "")}, from USDA food-cost data (
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
