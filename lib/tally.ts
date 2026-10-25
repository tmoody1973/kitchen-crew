// The budget math. Plain code, never the AI, so the numbers are always right.

export const WEEK_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const toCents = (dollars: number) => Math.round(dollars * 100);

/** A week lasts 7 days from the moment the budget was set. */
export function isWeekActive(startDate: number, now: number): boolean {
  return now - startDate < WEEK_DAYS * DAY_MS;
}

export function daysLeft(startDate: number, now: number): number {
  const daysSinceStart = Math.floor((now - startDate) / DAY_MS);
  return Math.max(0, WEEK_DAYS - daysSinceStart);
}

export type Tally = {
  budget: number;
  spent: number;
  left: number;
  daysLeft: number;
  status: "under" | "over";
};

/** paid: what was actually paid per list item; empty boxes are undefined. */
export function computeTally(
  budget: number,
  paid: ReadonlyArray<number | undefined>,
  startDate: number,
  now: number,
): Tally {
  // Add in whole cents so $0.10 + $0.20 is exactly $0.30.
  const spentCents = paid.reduce<number>((sum, p) => sum + (p === undefined ? 0 : toCents(p)), 0);
  const leftCents = toCents(budget) - spentCents;
  return {
    budget,
    spent: spentCents / 100,
    left: leftCents / 100,
    daysLeft: daysLeft(startDate, now),
    status: leftCents >= 0 ? "under" : "over",
  };
}

/** $142 for whole dollars, $11.50 otherwise. */
export function formatMoney(dollars: number): string {
  const digits = Number.isInteger(dollars) ? 0 : 2;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Row color: green when paid ≤ estimate, orange when paid more, neutral until both are known. */
export function rowStatus(estimate: number | undefined, paid: number | undefined): "under" | "over" | "none" {
  if (estimate === undefined || paid === undefined) return "none";
  return toCents(paid) <= toCents(estimate) ? "under" : "over";
}

/** Estimated cost of a row: price per package × packages. */
export function estimateTotal(estimate: number | undefined, packs = 1): number | undefined {
  return estimate === undefined ? undefined : (toCents(estimate) * packs) / 100;
}

export type Category = "dinner" | "extra";

/** Plan items are dinner ingredients; regulars and hand-added items are extras, unless changed on the row. */
export function categoryOf(item: { category?: Category; fromPlan?: boolean }): Category {
  return item.category ?? (item.fromPlan ? "dinner" : "extra");
}

export type SplitTally = {
  total: Tally;
  dinner: { budget: number; spent: number; left: number };
  extra: { budget: number; spent: number; left: number };
};

/** The week split into a Dinners share and an Extras share (budget = dinners + extras). */
export function computeSplitTally(
  budget: number,
  extrasBudget: number,
  items: ReadonlyArray<{ paid?: number; category?: Category; fromPlan?: boolean }>,
  startDate: number,
  now: number,
): SplitTally {
  const extras = Math.min(Math.max(extrasBudget, 0), budget);
  const part = (cat: Category, share: number) => {
    const spentCents = items.filter((i) => categoryOf(i) === cat).reduce((s, i) => s + (i.paid === undefined ? 0 : toCents(i.paid)), 0);
    return { budget: share, spent: spentCents / 100, left: (toCents(share) - spentCents) / 100 };
  };
  return {
    total: computeTally(budget, items.map((i) => i.paid), startDate, now),
    dinner: part("dinner", (toCents(budget) - toCents(extras)) / 100),
    extra: part("extra", extras),
  };
}

/** A suggested Extras share: the regulars' estimated total, rounded up to the next $5. */
export function suggestExtras(regulars: ReadonlyArray<{ estimate?: number; packs?: number }>): number {
  const cents = regulars.reduce((s, r) => s + (r.estimate === undefined ? 0 : toCents(r.estimate) * (r.packs ?? 1)), 0);
  return Math.ceil(cents / 500) * 5;
}
