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
