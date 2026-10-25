// How an ingredient amount is shown: metric amounts get an American equivalent alongside.

const G_PER_OZ = 28.3495;
const ML_PER_CUP = 236.588;
const ML_PER_TBSP = 14.7868;
const ML_PER_TSP = 4.92892;

// Liquids that weigh about 1 g per ml, so grams can be shown as cups.
const WATERY = /\b(water|milk|cream|broth|stock|juice|buttermilk|wine|vinegar)\b/i;

/** 2.5 → "2½", 0.25 → "¼", 1.33 → "1⅓". Rounds to the nearest quarter or third. */
export function fraction(n: number): string {
  const whole = Math.floor(n);
  const rest = n - whole;
  const parts: [number, string][] = [[0, ""], [0.25, "¼"], [1 / 3, "⅓"], [0.5, "½"], [2 / 3, "⅔"], [0.75, "¾"], [1, ""]];
  const [value, glyph] = parts.reduce((best, p) => (Math.abs(p[0] - rest) < Math.abs(best[0] - rest) ? p : best));
  const w = value === 1 ? whole + 1 : whole;
  if (w === 0 && glyph) return glyph;
  return `${w}${glyph}`;
}

function cups(ml: number): string {
  if (ml >= ML_PER_CUP / 4) return `${fraction(ml / ML_PER_CUP)} ${ml / ML_PER_CUP > 1.1 ? "cups" : "cup"}`;
  if (ml >= ML_PER_TBSP) return `${fraction(ml / ML_PER_TBSP)} tbsp`;
  return `${fraction(ml / ML_PER_TSP)} tsp`;
}

function ounces(g: number): string {
  const oz = g / G_PER_OZ;
  if (oz >= 16) return `${(oz / 16).toFixed(1).replace(/\.0$/, "")} lb`;
  return oz >= 2 ? `${Math.round(oz)} oz` : `${fraction(oz)} oz`;
}

export type UnitSystem = "us" | "metric";

const ML_PER: Record<string, number> = {
  cup: ML_PER_CUP, cups: ML_PER_CUP, tbsp: ML_PER_TBSP, tablespoon: ML_PER_TBSP, tsp: ML_PER_TSP, teaspoon: ML_PER_TSP,
  "fl oz": 29.5735, pint: 473.176, quart: 946.353, gal: 3785.41, gallon: 3785.41,
};
const G_PER: Record<string, number> = { oz: G_PER_OZ, ounce: G_PER_OZ, lb: 453.592, pound: 453.592, pounds: 453.592 };

function metricVolume(ml: number): string {
  return ml >= 1000 ? `${(ml / 1000).toFixed(2).replace(/\.?0+$/, "")} l` : `${Math.round(ml)} ml`;
}
function metricWeight(g: number): string {
  return g >= 1000 ? `${(g / 1000).toFixed(2).replace(/\.?0+$/, "")} kg` : `${Math.round(g)} g`;
}

/** The amount column in the chosen system: US "14 oz", "2½ cups"; metric "397 g", "887 ml"; counts unchanged. */
export function formatAmount(amount: number, unit: string, name: string, system: UnitSystem = "us"): string {
  const u = unit.trim().toLowerCase();
  if (u === "to taste" || u === "as needed") return u;
  const grams = u === "g" || u === "gram" || u === "grams" ? amount : u === "kg" ? amount * 1000 : G_PER[u] ? amount * G_PER[u] : null;
  const ml = u === "ml" ? amount : u === "l" || u === "liter" || u === "litre" ? amount * 1000 : ML_PER[u] ? amount * ML_PER[u] : null;

  if (system === "metric") {
    if (grams !== null) return metricWeight(grams);
    if (ml !== null) return metricVolume(ml);
  } else {
    const isMetric = ["g", "gram", "grams", "kg", "ml", "l", "liter", "litre"].includes(u);
    if (isMetric && grams !== null) {
      if (grams < 3) return `${Math.round(grams)} g`; // pinch-sized; a US measure would need the food's density
      return WATERY.test(name) ? cups(grams) : ounces(grams);
    }
    if (isMetric && ml !== null) return cups(ml);
  }
  // Already in the chosen system, or a count: kitchen fractions instead of decimals.
  const shown = Number.isInteger(amount) || amount >= 10 ? `${Math.round(amount * 100) / 100}` : fraction(amount);
  const plural = amount > 1 && /^(cup|clove|can|bunch|head|stalk|sprig|slice|piece)$/i.test(u) ? "s" : "";
  return `${shown} ${unit}${plural}`.trim();
}
