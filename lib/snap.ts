// SNAP math, plain code over USDA's published numbers.

// USDA FNS, SNAP maximum monthly allotment, FY 2027 (Oct 1, 2026 – Sept 30, 2027), 48 states and DC.
// https://www.fna.usda.gov/snap/allotment/cola (page updated Oct 1, 2026)
const MAX_ALLOTMENT = [0, 306, 562, 808, 1023, 1217, 1463, 1616, 1841];
const EACH_ADDITIONAL = 225;

/** USDA's maximum monthly SNAP benefit for a household this size (actual benefits are often lower). */
export function maxAllotment(people: number): number {
  const n = Math.max(1, Math.round(people));
  return n <= 8 ? MAX_ALLOTMENT[n] : MAX_ALLOTMENT[8] + (n - 8) * EACH_ADDITIONAL;
}

/** A month's benefit spread over its weeks (52 weeks / 12 months = 4.33). */
export const weeklyShare = (monthly: number) => Math.round((monthly * 12) / 52);

const toCents = (n: number) => Math.round(n * 100);

/**
 * What the week spent that SNAP could cover vs. what needs cash. SNAP: paid rows Kroger flags eligible.
 * Cash: paid rows Kroger doesn't flag, plus receipts' tax and fees (USDA: SNAP can't pay fees).
 * Unmarked: paid rows with no Kroger product (typed prices, older rows), counted in neither.
 */
export function snapSplit(
  items: ReadonlyArray<{ paid?: number; snap?: boolean; receiptId?: string }>,
  receipts: ReadonlyArray<{ total: number }>,
): { snap: number; cash: number; unmarked: number } {
  const paid = items.filter((i) => i.paid !== undefined);
  const sum = (pick: (i: (typeof paid)[number]) => boolean) => paid.reduce((s, i) => s + (pick(i) ? toCents(i.paid!) : 0), 0);
  const snap = sum((i) => i.snap === true);
  const nonSnapRows = sum((i) => i.snap === false);
  const unmarked = sum((i) => i.snap === undefined);
  const covered = paid.reduce((s, i) => s + (i.receiptId ? toCents(i.paid!) : 0), 0);
  const extra = Math.max(0, receipts.reduce((s, r) => s + toCents(r.total), 0) - covered);
  return { snap: snap / 100, cash: (nonSnapRows + extra) / 100, unmarked: unmarked / 100 };
}
