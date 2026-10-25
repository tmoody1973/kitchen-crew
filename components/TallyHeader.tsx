"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { computeTally, formatMoney, isWeekActive } from "@/lib/tally";

// "$142 of $200 this week · $58 left · 4 days left", plus whether you're under or over.
export default function TallyHeader() {
  const week = useQuery(api.weeks.latest);
  if (week === undefined) return null;

  const now = Date.now();
  if (week === null || !isWeekActive(week.startDate, now)) {
    return (
      <Link href="/budget" className="block rounded-2xl bg-carrot p-4 text-center font-black text-white">
        Set this week&apos;s budget to start →
      </Link>
    );
  }

  // ponytail: no list items until slice 2, so nothing is paid yet.
  const t = computeTally(week.budget, [], week.startDate, now);
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
      <p className="mt-1 font-extrabold">{under ? "You're under budget this week 🎉" : "You're over budget this week"}</p>
    </section>
  );
}
