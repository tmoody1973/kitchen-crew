// How big each dinner should be. Plain code so the crew and the checks agree on one number.

// 2 adults + a 16-year-old who eats like an adult and a half.
export const DEFAULT_SERVINGS = 3.5;
// "Plan leftovers for lunch" adds lunch for about one and a half more people the next day.
export const LEFTOVER_SERVINGS = 1.5;

export type Household = { servings: number; leftovers: boolean };

export const DEFAULT_HOUSEHOLD: Household = { servings: DEFAULT_SERVINGS, leftovers: false };

/** Servings each dinner should make. */
export function targetServings(h: Household = DEFAULT_HOUSEHOLD): number {
  return h.servings + (h.leftovers ? LEFTOVER_SERVINGS : 0);
}

/** 3.5 → "3½", 5 → "5". */
export function formatServings(n: number): string {
  const whole = Math.floor(n);
  return n - whole >= 0.5 ? `${whole}½` : `${Math.round(n)}`;
}
