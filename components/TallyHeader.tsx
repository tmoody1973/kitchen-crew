"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { actualPaid, computeSplitTally, computeTally, formatMoney, isWeekActive, receiptExtra } from "@/lib/tally";
import { snapSplit, weeklyShare } from "@/lib/snap";
import { ArrowRight } from "lucide-react";

/** Keeps the tally in view: once the big board scrolls under the top menu, a slim copy pins just below it. */
function ScrollPin({ children, slim }: { children: ReactNode; slim: ReactNode }) {
  const board = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState<number | null>(null);
  useEffect(() => {
    const el = board.current;
    if (!el) return;
    const navBottom = Math.round(document.querySelector("header")?.getBoundingClientRect().bottom ?? 0);
    const watch = new IntersectionObserver(
      ([e]) => setTop(e.isIntersecting || e.boundingClientRect.top > navBottom ? null : navBottom),
      { rootMargin: `-${navBottom}px 0px 0px 0px` },
    );
    watch.observe(el);
    return () => watch.disconnect();
  }, []);
  return (
    <>
      <div ref={board}>{children}</div>
      {/* Floats over the page (no layout jump); hidden from screen readers, which hear the big board's updates. */}
      {top !== null && (
        <div className="fixed inset-x-0 z-10 mx-auto max-w-xl bg-ground/95 px-3 pb-1.5 pt-1 lg:hidden" style={{ top }} aria-hidden="true">
          {slim}
        </div>
      )}
    </>
  );
}

/** Board numerals in cells; a digit that changes flips over, like a market price board. */
export function BoardNumber({ value }: { value: string }) {
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

// The chalkboard: where the week stands, in one glance. offset 1 shows next week's board.
export default function TallyHeader({ offset = 0 }: { offset?: number }) {
  const thisWeek = useQuery(api.weeks.latest, offset === 0 ? {} : "skip");
  const nextWeek = useQuery(api.weeks.byOffset, offset === 1 ? { offset: 1 } : "skip");
  const week = offset === 1 ? nextWeek : thisWeek;
  const items = useQuery(api.listItems.mine, { offset });
  const receipts = useQuery(api.receipts.forWeek, { offset });
  const household = useQuery(api.household.mine);
  if (week === undefined || items === undefined || receipts === undefined) {
    return <div className="board h-[118px] animate-pulse" aria-label="Loading your week" />;
  }

  const now = Date.now();
  if (offset === 1 && week) {
    // Next week hasn't started: show its budget and what's planned, counting down from its first day.
    const t = computeTally(week.budget, actualPaid(items, receipts), week.startDate, week.startDate);
    return (
      <section className="board px-4 pb-3 pt-4" aria-label="Next week's tally">
        <p className="font-sign flex flex-wrap items-baseline gap-x-2 text-[2rem] leading-none">
          <BoardNumber value={formatMoney(t.spent)} />
          <span className="text-base text-chalk-dim">of {formatMoney(t.budget)}</span>
        </p>
        <p className="font-sign mt-2 text-sm text-tag">Next week · starts {new Date(week.startDate).toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" })}</p>
      </section>
    );
  }
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

  // Finished trips count at their receipt totals (tax and fees included); other rows at their paid boxes.
  const t = computeTally(week.budget, actualPaid(items, receipts), week.startDate, now);
  const extra = receiptExtra(items, receipts);
  const snapMonthly = household?.snapMonthly;
  const snapPart = snapMonthly !== undefined ? snapSplit(items, receipts) : null;
  const under = t.status === "under";
  const split = week.extrasBudget ? computeSplitTally(week.budget, week.extrasBudget, items, week.startDate, now) : null;
  const spoken = `${formatMoney(t.spent)} of ${formatMoney(t.budget)} spent this week. ${formatMoney(Math.abs(t.left))} ${
    under ? "left" : "over"
  }, ${t.daysLeft} days left.`;

  const slim = (
    <div className="board flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2 text-sm font-bold text-chalk-dim">
      <span>
        <span className={`font-sign ${under ? "text-chalk" : "text-tag"}`}>
          {formatMoney(Math.abs(t.left))} {under ? "left" : "over"}
        </span>{" "}
        · {formatMoney(t.spent)} of {formatMoney(t.budget)}
      </span>
      {split && (
        <span className="flex gap-1.5 text-xs font-extrabold">
          <span className={`chalk-pill ${split.dinner.left < 0 ? "border-tag text-tag" : ""}`}>Dinners {formatMoney(split.dinner.spent)} / {formatMoney(split.dinner.budget)}</span>
          <span className={`chalk-pill ${split.extra.left < 0 ? "border-tag text-tag" : ""}`}>Extras {formatMoney(split.extra.spent)} / {formatMoney(split.extra.budget)}</span>
        </span>
      )}
    </div>
  );

  return (
    <ScrollPin slim={slim}>
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
      {(split || snapPart || extra !== 0) && (
        <p className="mt-2 flex flex-wrap gap-2 text-xs font-extrabold">
          {split && (
            <>
              <span className={`chalk-pill ${split.dinner.left < 0 ? "border-tag text-tag" : ""}`}>
                Dinners {formatMoney(split.dinner.spent)} / {formatMoney(split.dinner.budget)}
                {split.dinner.left < 0 ? " · over" : ""}
              </span>
              <span className={`chalk-pill ${split.extra.left < 0 ? "border-tag text-tag" : ""}`}>
                Extras {formatMoney(split.extra.spent)} / {formatMoney(split.extra.budget)}
                {split.extra.left < 0 ? " · over" : ""}
              </span>
            </>
          )}
          {snapPart && snapMonthly !== undefined && (
            <span className="chalk-pill" title="SNAP: paid items Kroger marks SNAP-eligible; cash: everything else, plus tax and fees">
              SNAP {formatMoney(snapPart.snap)} / {formatMoney(weeklyShare(snapMonthly))} · cash {formatMoney(snapPart.cash)}
              {snapPart.unmarked > 0 ? ` · ${formatMoney(snapPart.unmarked)} unmarked` : ""}
            </span>
          )}
          {extra !== 0 && (
            <span className="chalk-pill" title="Receipt totals minus the paid boxes they cover: tax, fees, and register differences">
              Receipt {extra > 0 ? "+" : "−"}
              {formatMoney(Math.abs(extra))}
            </span>
          )}
        </p>
      )}
      <p className="font-sign mt-2 text-sm text-tag">{under ? "Under budget this week!" : "Over budget this week. Let's trim."}</p>
    </section>
    </ScrollPin>
  );
}
