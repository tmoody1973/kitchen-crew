import { Check, TrendingUp } from "lucide-react";
import { formatMoney } from "@/lib/tally";

// The verdict, stamped: fits (kale ink) or over by $X (squash ink). Words always carry it, not just color.
export default function BudgetFit({ total, remaining, fits, overBy }: { total: number; remaining: number; fits: boolean; overBy: number }) {
  return (
    <div className={`crate flex flex-wrap items-center justify-between gap-3 p-4 ${fits ? "border-kale bg-kale-wash" : "border-squash bg-squash-wash"}`}>
      <span className={`stamp text-base ${fits ? "under" : "over"}`}>
        {fits ? <Check size={16} strokeWidth={3.5} aria-hidden /> : <TrendingUp size={16} strokeWidth={3} aria-hidden />}
        {fits ? "Fits your budget" : `Over by ${formatMoney(overBy)}`}
      </span>
      <span className="text-sm font-extrabold text-ink-soft">
        Plan <span className="tag ml-1 text-sm">{formatMoney(total)}</span>
        <span className="ml-3">{formatMoney(remaining)} left</span>
      </span>
    </div>
  );
}
