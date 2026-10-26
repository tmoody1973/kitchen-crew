// Spending over time: weeks rolled up by week, month, or quarter. Plain code over saved numbers.

export type WeekTotals = {
  weekId: string;
  startDate: number;
  budget: number;
  planned: number; // Kroger estimates for the whole list (price × packs)
  shelf: number; // paid boxes
  actual: number; // receipts' totals plus paid boxes not on a receipt
  receipts: number;
  sample?: boolean;
};

export type Period = "week" | "month" | "quarter";

export type PeriodTotals = {
  key: string;
  label: string;
  budget: number;
  planned: number;
  actual: number;
  weeks: number;
  sample: boolean; // every week in it is a labelled sample week
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** A week belongs to the month (and quarter) it starts in. */
function periodOf(startDate: number, period: Period): { key: string; label: string } {
  const d = new Date(startDate);
  const y = d.getFullYear();
  const m = d.getMonth();
  if (period === "month") return { key: `${y}-${String(m + 1).padStart(2, "0")}`, label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }) };
  if (period === "quarter") return { key: `${y}-Q${Math.floor(m / 3) + 1}`, label: `Q${Math.floor(m / 3) + 1} ${y}` };
  return { key: String(startDate), label: `Week of ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` };
}

/** Newest period first. */
export function rollUp(weeks: ReadonlyArray<WeekTotals>, period: Period): PeriodTotals[] {
  const groups = new Map<string, PeriodTotals & { start: number }>();
  for (const w of weeks) {
    const { key, label } = periodOf(w.startDate, period);
    const g = groups.get(key) ?? { key, label, budget: 0, planned: 0, actual: 0, weeks: 0, sample: true, start: w.startDate };
    groups.set(key, {
      ...g,
      budget: round2(g.budget + w.budget),
      planned: round2(g.planned + w.planned),
      actual: round2(g.actual + w.actual),
      weeks: g.weeks + 1,
      sample: g.sample && !!w.sample,
      start: Math.max(g.start, w.startDate),
    });
  }
  return [...groups.values()].sort((a, b) => b.start - a.start).map(({ start: _start, ...rest }) => rest);
}
