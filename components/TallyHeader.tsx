"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { computeSplitTally, computeTally, formatMoney, isWeekActive } from "@/lib/tally";
import { ArrowRight } from "lucide-react";

/** Board numerals in cells; a digit that changes flips over, like a market price board. */
function BoardNumber({ value }: { value: string }) {
  const prev = useRef(value);
  const changed = prev.current !== value;
  const old = prev.current;
  useEffect(() => {
    prev.current = value;
  }, [value]);
  return (
    <span className="board-number" aria-hidden>
      {value.split("").map((ch, i) => {
        // Align from the right so "$98" → "$102" flips the right cells.
        const before = old[old.length - (value.length - i)];
        const flip = changed && before !== ch;
        return (
          <span key={`${i}-${ch}-${flip ? value : ""}`} className={`board-cell ${flip ? "flip" : ""}`}>
            {ch}
          </span>
        );
      })}
    </span>
  );
}

// The chalkboard: where the week stands, in one glance.
export default function TallyHeader() {
  const week = useQuery(api.weeks.latest);
  const items = useQuery(api.listItems.mine);
  if (week === undefined || items === undefined) {
    return <div className="board h-[118px] animate-pulse" aria-label="Loading your week" />;
  }

  const now = Date.now();
  if (week === null || !isWeekActive(week.startDate, now)) {
    return (
      <Link href="/budget" className="board block p-4">
        <p className="font-sign text-xl text-tag">New week, fresh board</p>
        <p className="mt-1 flex items-center gap-1 font-bold text-chalk-dim">
          Set this week&apos;s budget to start the tally <ArrowRight size={16} strokeWidth={3} aria-hidden />
        </p>
      </Link>
    );
  }

  const t = computeTally(week.budget, items.map((i) => i.paid), week.startDate, now);
  const under = t.status === "under";
  const split = week.extrasBudget ? computeSplitTally(week.budget, week.extrasBudget, items, week.startDate, now) : null;
  const spoken = `${formatMoney(t.spent)} of ${formatMoney(t.budget)} spent this week. ${formatMoney(Math.abs(t.left))} ${
    under ? "left" : "over"
  }, ${t.daysLeft} days left.`;

  return (
    <section className="board px-4 pb-3 pt-4" aria-label="This week's tally">
      {/* Screen readers hear one sentence when the numbers change (the board cells are hidden from them). */}
      <p className="sr-only" aria-live="polite">
        {spoken}
      </p>
      <p className="font-sign flex flex-wrap items-baseline gap-x-2 text-[2rem] leading-none">
        <BoardNumber value={formatMoney(t.spent)} />
        <span className="text-base text-chalk-dim">of {formatMoney(t.budget)}</span>
      </p>
      <p className="mt-2 text-sm font-bold text-chalk-dim">
        <span className={`font-sign ${under ? "text-chalk" : "text-tag"}`}>
          {formatMoney(Math.abs(t.left))} {under ? "left" : "over"}
        </span>{" "}
        · {t.daysLeft} {t.daysLeft === 1 ? "day" : "days"} left
      </p>
      {split && (
        <p className="mt-2 flex flex-wrap gap-2 text-xs font-extrabold">
          <span className={`chalk-pill ${split.dinner.left < 0 ? "border-tag text-tag" : ""}`}>
            Dinners {formatMoney(split.dinner.spent)} / {formatMoney(split.dinner.budget)}
            {split.dinner.left < 0 ? " · over" : ""}
          </span>
          <span className={`chalk-pill ${split.extra.left < 0 ? "border-tag text-tag" : ""}`}>
            Extras {formatMoney(split.extra.spent)} / {formatMoney(split.extra.budget)}
            {split.extra.left < 0 ? " · over" : ""}
          </span>
        </p>
      )}
      <p className="font-sign mt-2 text-sm text-tag">{under ? "Under budget this week!" : "Over budget this week. Let's trim."}</p>
    </section>
  );
}
