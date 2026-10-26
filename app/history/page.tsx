"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { rollUp, type Period } from "@/lib/history";
import { formatMoney } from "@/lib/tally";

const PERIODS: { id: Period; label: string }[] = [
  { id: "week", label: "Weekly" },
  { id: "month", label: "Monthly" },
  { id: "quarter", label: "Quarterly" },
];

// Spending over time: each week's, month's, or quarter's actual spend against its budget and the plan.
export default function HistoryPage() {
  const weeks = useQuery(api.history.weeks);
  const [period, setPeriod] = useState<Period>("month");
  if (weeks === undefined) return <div className="crate h-40 animate-pulse" aria-label="Loading your history" />;

  const rows = rollUp(weeks, period);
  const total = rows.reduce((s, r) => ({ budget: s.budget + r.budget, actual: s.actual + r.actual }), { budget: 0, actual: 0 });
  const anySample = rows.some((r) => r.sample);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="sign">Spending history</h1>
      {weeks.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-line p-5 text-center font-bold text-ink-soft">
          Nothing yet. Finish a week of shopping (and snap the receipt on the{" "}
          <Link href="/list" className="font-extrabold text-ink underline">List</Link>) to start your history.
        </p>
      ) : (
        <>
          <div className="board px-4 py-3">
            <p className="font-sign text-2xl leading-tight">
              {formatMoney(total.actual)} <span className="text-base text-chalk-dim">of {formatMoney(total.budget)} budgeted</span>
            </p>
            <p className="font-sign mt-1 text-sm text-tag">
              {total.actual <= total.budget ? `${formatMoney(total.budget - total.actual)} under across ${weeks.length} weeks` : `${formatMoney(total.actual - total.budget)} over across ${weeks.length} weeks`}
            </p>
          </div>
          <div className="flex self-start rounded-full border-2 border-ink bg-white p-0.5 text-sm font-black" role="radiogroup" aria-label="Group by">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={period === p.id}
                onClick={() => setPeriod(p.id)}
                className={`rounded-full px-3 py-1 ${period === p.id ? "bg-ink text-chalk" : "text-ink-soft"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <ul className="flex flex-col gap-2 lg:grid lg:grid-cols-2">
            {rows.map((r) => {
              const under = r.actual <= r.budget;
              const pct = r.budget > 0 ? Math.min(100, (r.actual / r.budget) * 100) : 0;
              return (
                <li key={r.key} className="crate flex flex-col gap-2 p-3">
                  <p className="flex flex-wrap items-center gap-2 font-black">
                    {r.label}
                    {period !== "week" && <span className="text-xs font-bold text-ink-soft">{r.weeks} {r.weeks === 1 ? "week" : "weeks"}</span>}
                    {r.sample && <span className="rounded-full border-2 border-ink px-2 text-xs font-extrabold">Sample</span>}
                  </p>
                  <div className="h-3 overflow-hidden rounded-full bg-line" aria-hidden>
                    <div className={`h-full rounded-full ${under ? "bg-kale" : "bg-squash"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <dl className="grid grid-cols-3 gap-1 text-sm">
                    <div><dt className="text-xs font-extrabold text-ink-soft">Budget</dt><dd className="font-black">{formatMoney(r.budget)}</dd></div>
                    <div><dt className="text-xs font-extrabold text-ink-soft">Planned</dt><dd className="font-black">{formatMoney(r.planned)}</dd></div>
                    <div><dt className="text-xs font-extrabold text-ink-soft">Actual</dt><dd className="font-black">{formatMoney(r.actual)}</dd></div>
                  </dl>
                  <p className="text-sm font-extrabold">
                    <span className={under ? "text-kale-ink" : "text-squash-ink"}>
                      {under ? `${formatMoney(r.budget - r.actual)} under budget` : `${formatMoney(r.actual - r.budget)} over budget`}
                    </span>
                    {r.planned > 0 && (
                      <span className="text-ink-soft">
                        {` · ${r.actual <= r.planned ? `${formatMoney(r.planned - r.actual)} under` : `${formatMoney(r.actual - r.planned)} over`} the plan`}
                      </span>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
          {anySample && <p className="text-xs font-bold text-ink-soft">Weeks marked Sample are made-up history on the demo account, so the monthly and quarterly views have something to show.</p>}
          <p className="text-xs font-bold text-ink-soft">Actual counts receipt totals (tax and fees included) where a trip was confirmed, and paid boxes otherwise. Planned is the Kroger estimate for the week&apos;s list.</p>
        </>
      )}
    </div>
  );
}
