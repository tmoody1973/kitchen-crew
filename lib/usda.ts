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

const WEEKLY_COST_PER_PERSON: Record<PlanLevel, { man: number; woman: number; teenBoy: number }> = {
  thrifty: { man: 73.6, woman: 58.6, teenBoy: 75.3 },
  low: { man: 73.3, woman: 63.8, teenBoy: 74.5 },
  moderate: { man: 91.9, woman: 77.6, teenBoy: 93.1 },
};

// USDA prices assume a 4-person household; for 3 people it says "add 5 percent".
const THREE_PERSON_ADJUSTMENT = 1.05;

export const DEFAULT_PLAN_LEVEL: PlanLevel = "low";

/** Suggested weekly grocery budget for the household, rounded to whole dollars. */
export function suggestedBudget(level: PlanLevel = DEFAULT_PLAN_LEVEL): number {
  const { man, woman, teenBoy } = WEEKLY_COST_PER_PERSON[level];
  return Math.round((man + woman + teenBoy) * THREE_PERSON_ADJUSTMENT);
}
