import type { Members } from "./usda";

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


/** Dinner servings for a household: adults 1, teens 1.5, kids 6–11 ¾, little kids ½ (rounded to the nearest half). */
export function servingsFor(m: Members): number {
  const raw = m.men + m.women + 1.5 * (m.teenBoys + m.teenGirls) + 0.75 * m.kids + 0.5 * m.littleKids;
  return Math.min(12, Math.max(1, Math.round(raw * 2) / 2));
}

/** "2 adults, a teen, and 2 young kids" for the crew's instructions. */
export function describeHousehold(m: Members): string {
  const part = (n: number, one: string, many: string) => (n === 0 ? [] : [n === 1 ? `1 ${one}` : `${n} ${many}`]);
  const parts = [
    ...part(m.men + m.women, "adult", "adults"),
    ...part(m.teenBoys + m.teenGirls, "teenager (eats like an adult and a half)", "teenagers (each eats like an adult and a half)"),
    ...part(m.kids, "child aged 6–11", "children aged 6–11"),
    ...part(m.littleKids, "little kid aged 1–5", "little kids aged 1–5"),
  ];
  return parts.length <= 1 ? (parts[0] ?? "1 adult") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}
