// Recipe amounts → whole packages to buy. Plain code, never the AI.

type Dimension = "weight" | "volume" | "count";

// How much of the base unit (grams, millilitres, items) one of each unit is.
const UNITS: Record<string, { dim: Dimension; base: number }> = {
  g: { dim: "weight", base: 1 },
  gram: { dim: "weight", base: 1 },
  kg: { dim: "weight", base: 1000 },
  oz: { dim: "weight", base: 28.3495 },
  ounce: { dim: "weight", base: 28.3495 },
  lb: { dim: "weight", base: 453.592 },
  pound: { dim: "weight", base: 453.592 },
  ml: { dim: "volume", base: 1 },
  l: { dim: "volume", base: 1000 },
  liter: { dim: "volume", base: 1000 },
  litre: { dim: "volume", base: 1000 },
  "fl oz": { dim: "volume", base: 29.5735 },
  cup: { dim: "volume", base: 236.588 },
  tbsp: { dim: "volume", base: 14.7868 },
  tablespoon: { dim: "volume", base: 14.7868 },
  tsp: { dim: "volume", base: 4.92892 },
  teaspoon: { dim: "volume", base: 4.92892 },
  pint: { dim: "volume", base: 473.176 },
  quart: { dim: "volume", base: 946.353 },
  gal: { dim: "volume", base: 3785.41 },
  gallon: { dim: "volume", base: 3785.41 },
  ct: { dim: "count", base: 1 },
  count: { dim: "count", base: 1 },
  each: { dim: "count", base: 1 },
  piece: { dim: "count", base: 1 },
  whole: { dim: "count", base: 1 },
};

/** "Pounds" → "pound", "fl. oz" → "fl oz", "Cups" → "cup". */
function normalizeUnit(unit: string): string {
  const u = unit.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
  if (UNITS[u]) return u;
  const singular = u.endsWith("es") && UNITS[u.slice(0, -2)] ? u.slice(0, -2) : u.replace(/s$/, "");
  return singular;
}

export type Amount = { dim: Dimension; base: number };

/** 1.5 "lb" → 680 g of weight; unknown units ("clove", "pinch", "bunch") → null. */
export function toBase(amount: number, unit: string): Amount | null {
  const u = UNITS[normalizeUnit(unit)];
  return u && amount > 0 ? { dim: u.dim, base: amount * u.base } : null;
}

/** Kroger sizes like "1 lb", "6.7 fl oz", "24 ct", "2 liter", "3 lb bag", "12 ct / 1.5 oz". First amount wins. */
export function parseSize(size: string | undefined): Amount | null {
  if (!size) return null;
  const m = size.toLowerCase().match(/(\d+(?:\.\d+)?)\s*(fl\.? ?oz|[a-z]+)/);
  return m ? toBase(Number(m[1]), m[2]) : null;
}

export type Packs = { packs: number; exact: boolean };

/**
 * Packages needed for a recipe amount: round up, since you can't buy 1.5 packs.
 * When units don't convert ("3 cloves" vs a "1 ct" bulb) fall back to 1 package, marked inexact.
 */
export function packagesNeeded(need: Amount | null, size: string | undefined): Packs {
  const pkg = parseSize(size);
  // "2 ct canned coconut milk" means 2 cans, whatever size a can is.
  if (need?.dim === "count" && pkg?.dim !== "count") return { packs: Math.max(1, Math.ceil(need.base - 1e-6)), exact: true };
  if (!need || !pkg || need.dim !== pkg.dim) return { packs: 1, exact: false };
  // Tiny tolerance so 1.0000001 packs (unit-conversion rounding) stays 1.
  return { packs: Math.max(1, Math.ceil(need.base / pkg.base - 1e-6)), exact: true };
}

/** Adds amounts of the same thing; mismatched or unknown units → null (price as 1 package). */
export function addAmounts(a: Amount | null, b: Amount | null): Amount | null {
  return a && b && a.dim === b.dim ? { dim: a.dim, base: a.base + b.base } : null;
}
