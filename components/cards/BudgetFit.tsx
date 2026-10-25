import { formatMoney } from "@/lib/tally";

// "Fits!" or "Over by $X", always in words as well as color.
export default function BudgetFit({ total, remaining, fits, overBy }: { total: number; remaining: number; fits: boolean; overBy: number }) {
  return (
    <div className={`rounded-2xl border-b-4 p-4 text-white ${fits ? "border-leaf-dark bg-leaf" : "border-carrot-dark bg-carrot"}`}>
      <p className="text-xl font-black">{fits ? "Fits your budget! 🎉" : `Over by ${formatMoney(overBy)}`}</p>
      <p className="font-bold">
        Plan {formatMoney(total)} · {formatMoney(remaining)} left this week
      </p>
    </div>
  );
}
