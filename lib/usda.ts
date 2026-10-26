// USDA weekly food cost per person, U.S. average, September 2026 (issued October 2026).
// Low-cost and moderate: https://www.fns.usda.gov/sites/default/files/resource-files/CostofFoodSep2026LowModLib.pdf
// Thrifty:               https://www.fns.usda.gov/sites/default/files/resource-files/CostofFoodSep2026Thrifty.pdf
// Index of monthly reports: https://www.fns.usda.gov/cnpp/usda-food-plans-cost-food-monthly-reports
// Household: 2 adults + a 16-year-old son. The Thrifty report bands ages as 20–50 and 14–19;
// the other plans use 19–50 and 14–18. Same people either way.

export type PlanLevel = "thrifty" | "low" | "moderate";

export const PLAN_LABELS: Record<PlanLevel, string> = {
  thrifty: "Thrifty",
  low: "Low-cost",
  moderate: "Moderate-cost",
};

// Weekly cost per person, by the groups onboarding asks about. Adults use 19–50 (20–50 Thrifty),
// teens 14–18 (14–19 Thrifty), kids 6–11 is the average of 6–8 and 9–11, little kids 1–5 the average of 1, 2–3 and 4–5.
// ponytail: adults 51+ use the 19–50 cost (within ~$7/week); add bands if onboarding asks for older adults.
type Group = "men" | "women" | "teenBoys" | "teenGirls" | "kids" | "littleKids";
const avg = (...ns: number[]) => ns.reduce((a, b) => a + b, 0) / ns.length;
const WEEKLY_COST_PER_PERSON: Record<PlanLevel, Record<Group, number>> = {
  thrifty: { men: 73.6, women: 58.6, teenBoys: 75.3, teenGirls: 60.0, kids: avg(48.3, 55.8), littleKids: avg(26.3, 39.8, 43.4) },
  low: { men: 73.3, women: 63.8, teenBoys: 74.5, teenGirls: 62.5, kids: avg(60.4, 62.6), littleKids: avg(38.1, 40.0, 41.3) },
  moderate: { men: 91.9, women: 77.6, teenBoys: 93.1, teenGirls: 74.6, kids: avg(70.3, 80.7), littleKids: avg(42.9, 47.8, 51.1) },
};

/** Who eats at home, by USDA age-sex group. */
export type Members = Record<Group, number>;

// Tarik's household: 2 adults and a 16-year-old son. The default for accounts that never did onboarding.
export const DEFAULT_MEMBERS: Members = { men: 1, women: 1, teenBoys: 1, teenGirls: 0, kids: 0, littleKids: 0 };

export const peopleIn = (m: Members) => m.men + m.women + m.teenBoys + m.teenGirls + m.kids + m.littleKids;

/** USDA prices assume 4 people: 1 → +20%, 2 → +10%, 3 → +5%, 4 → none, 5–6 → −5%, 7+ → −10%. */
export function sizeAdjustment(people: number): number {
  if (people <= 1) return 1.2;
  if (people === 2) return 1.1;
  if (people === 3) return 1.05;
  if (people === 4) return 1;
  return people <= 6 ? 0.95 : 0.9;
}

export const DEFAULT_PLAN_LEVEL: PlanLevel = "low";

/** Suggested weekly grocery budget for the household, rounded to whole dollars. */
export function suggestedBudget(level: PlanLevel = DEFAULT_PLAN_LEVEL, members: Members = DEFAULT_MEMBERS): number {
  const cost = WEEKLY_COST_PER_PERSON[level];
  const sum = (Object.keys(cost) as Group[]).reduce((s, g) => s + cost[g] * (members[g] ?? 0), 0);
  return Math.round(sum * sizeAdjustment(peopleIn(members)));
}
