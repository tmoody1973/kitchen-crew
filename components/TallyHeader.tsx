"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { computeSplitTally, computeTally, formatMoney, isWeekActive } from "@/lib/tally";

// "$142 of $200 this week · $58 left · 4 days left", plus whether you're under or over.
export default function TallyHeader() {
  const week = useQuery(api.weeks.latest);
  const items = useQuery(api.listItems.mine);
  if (week === undefined || items === undefined) return null;

  const now = Date.now();
  if (week === null || !isWeekActive(week.startDate, now)) {
    return (
      <Link href="/budget" className="block rounded-2xl bg-carrot p-4 text-center font-black text-white">
        Set this week&apos;s budget to start →
      </Link>
    );
  }

  const t = computeTally(
    week.budget,
    items.map((i) => i.paid),
    week.startDate,
    now,
  );
  const under = t.status === "under";
  return (
    <section
      className={`rounded-2xl border-b-4 p-4 text-white ${under ? "border-leaf-dark bg-leaf" : "border-carrot-dark bg-carrot"}`}
    >
      <p className="text-2xl font-black">
        {formatMoney(t.spent)} of {formatMoney(t.budget)} this week
      </p>
      <p className="font-bold">
        {formatMoney(Math.abs(t.left))} {under ? "left" : "over"} · {t.daysLeft} {t.daysLeft === 1 ? "day" : "days"} left
      </p>
      {week.extrasBudget ? <SplitLine week={week} items={items} now={now} /> : null}
      <p className="mt-1 font-extrabold">{under ? "You're under budget this week 🎉" : "You're over budget this week"}</p>
    </section>
  );
}

// "🍽 Dinners $98 of $160 · 🛒 Extras $41 of $62"
function SplitLine({
  week,
  items,
  now,
}: {
  week: { budget: number; extrasBudget?: number; startDate: number };
  items: { paid?: number; category?: "dinner" | "extra"; fromPlan?: boolean }[];
  now: number;
}) {
  const s = computeSplitTally(week.budget, week.extrasBudget ?? 0, items, week.startDate, now);
  const part = (label: string, p: { spent: number; budget: number; left: number }) => (
    <span className={p.left < 0 ? "underline decoration-2" : ""}>
      {label} {formatMoney(p.spent)} of {formatMoney(p.budget)}
      {p.left < 0 ? " (over)" : ""}
    </span>
  );
  return (
    <p className="mt-1 flex flex-wrap gap-x-3 text-sm font-bold">
      {part("🍽 Dinners", s.dinner)}
      {part("🛒 Extras", s.extra)}
    </p>
  );
}
