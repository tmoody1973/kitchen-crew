"use client";

import { useEffect, useRef, useState } from "react";
import { Check, TrendingUp } from "lucide-react";
import { BoardNumber } from "@/components/TallyHeader";
import { formatMoney } from "@/lib/tally";

const BUDGET = 225;
// Already paid earlier in the demo week (green onions and pasta), so the board ends where the List screenshot shows: $24.56.
const PRIOR = 2.68;
const DAYS_LEFT = 7;
// Rows from the demo account's sample week: the Kroger estimate, then what was typed in as paid.
const ROWS = [
  { name: "Boneless chicken thighs", estimate: 3.99, paid: 3.69 },
  { name: "Garlic", estimate: 1.58, paid: 1.08 },
  { name: "Unsalted butter", estimate: 3.49, paid: 4.34 },
  { name: "Heavy cream", estimate: 3.29, paid: 2.89 },
  { name: "Parmigiano-Reggiano", estimate: 8.99, paid: 8.89 },
  { name: "Shallot", estimate: 0.99, paid: 0.99 },
];
const STEP_MS = 700;

/** The landing's first stall: a sample week's rows get paid one by one while the board counts up, once. */
export default function TallyStall() {
  const root = useRef<HTMLDivElement>(null);
  const [paidCount, setPaidCount] = useState(0);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPaidCount(ROWS.length);
      return;
    }
    let timer: ReturnType<typeof setInterval> | undefined;
    const watch = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || timer) return;
        watch.disconnect();
        timer = setInterval(() => {
          setPaidCount((n) => {
            if (n + 1 >= ROWS.length) clearInterval(timer);
            return Math.min(n + 1, ROWS.length);
          });
        }, STEP_MS);
      },
      { threshold: 0.4 },
    );
    watch.observe(el);
    return () => {
      watch.disconnect();
      clearInterval(timer);
    };
  }, []);

  const spent = PRIOR + ROWS.slice(0, paidCount).reduce((sum, r) => sum + r.paid, 0);
  const done = paidCount === ROWS.length;

  return (
    <div ref={root} className="flex flex-col gap-3">
      <div className="board px-5 pb-4 pt-5">
        <p className="sr-only" aria-live="polite">
          {done ? `${formatMoney(spent)} of ${formatMoney(BUDGET)} spent. Under budget this week.` : ""}
        </p>
        <p className="font-sign flex flex-wrap items-baseline gap-x-2 text-[2.6rem] leading-none sm:text-5xl">
          <BoardNumber value={formatMoney(spent)} />
          <span className="text-lg text-chalk-dim">of {formatMoney(BUDGET)}</span>
        </p>
        <p className="mt-2 text-sm font-bold text-chalk-dim">
          <span className="font-sign text-chalk">{formatMoney(BUDGET - spent)} left</span> · {DAYS_LEFT} days left
        </p>
        {/* The verdict lands as the stall's stamp once the last row is paid (space reserved, so nothing jumps). */}
        <p className="mt-3 h-8" aria-hidden={!done}>
          <span className={`stamp text-sm text-tag ${done ? "stamp-land" : "opacity-0"}`}>Under budget this week</span>
        </p>
      </div>

      <ul className="flex flex-col gap-2" aria-label="Sample shopping list">
        {ROWS.map((r, i) => {
          const paid = i < paidCount;
          const over = r.paid > r.estimate;
          const tone = !paid ? "border-line bg-white" : over ? "border-squash bg-squash-wash" : "border-kale bg-kale-wash";
          return (
            <li key={r.name} className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border-2 px-3 py-2 transition-colors duration-300 ${tone}`}>
              <span className="min-w-0 flex-1 truncate font-black">{r.name}</span>
              <span className="tag text-sm">{formatMoney(r.estimate)}</span>
              <span className="flex w-20 justify-end text-sm font-extrabold text-ink-soft">
                {paid ? <span className="font-sign text-base text-ink">{formatMoney(r.paid)}</span> : "paid"}
              </span>
              {paid && (
                <span className={`flex basis-full items-center gap-1 text-xs font-extrabold ${over ? "text-squash-ink" : "text-kale-ink"}`}>
                  {over ? <TrendingUp size={14} strokeWidth={3} aria-hidden /> : <Check size={14} strokeWidth={3} aria-hidden />}
                  {over
                    ? `${formatMoney(r.paid - r.estimate)} more than the estimate`
                    : r.paid === r.estimate
                      ? "Right on the estimate"
                      : `Nice! ${formatMoney(r.estimate - r.paid)} under the estimate`}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-xs font-bold text-ink-soft">Sample week from a demo account. Prices from Kroger at Pick &apos;n Save.</p>
    </div>
  );
}
