// The shopping list arranged by dinner (the List's "By dinner" view). Same rows, just grouped:
// an item merged across dinners (one 3-pack of chicken) shows once, in "Shared", naming its dinners.
import { key } from "./meal-plan";
import { estimateTotal } from "./tally";

type Dinner = { name: string; dayIndex?: number; planId?: string; ingredients?: { name: string; pantry: boolean }[] };
type Scheduled = Dinner & { dayIndex: number };
export type ListGroup<T> = { title: string; items: { item: T; dinners: string[] }[] };

export function groupByDinner<T extends { name: string }>(
  rows: readonly T[],
  dinners: readonly Dinner[],
  label: (d: Scheduled) => string,
): ListGroup<T>[] {
  // Ideas (no day) aren't on the list; pantry staples aren't bought.
  const scheduled = dinners.filter((d): d is Scheduled => d.dayIndex !== undefined).sort((a, b) => a.dayIndex - b.dayIndex);
  const buys = scheduled.map((d) => new Set((d.ingredients ?? []).filter((i) => !i.pantry).map((i) => key(i.name))));

  const shared: ListGroup<T>["items"] = [];
  const perDinner = scheduled.map(() => [] as ListGroup<T>["items"]);
  const rest: ListGroup<T>["items"] = [];
  for (const item of rows) {
    const uses = scheduled.flatMap((_, n) => (buys[n].has(key(item.name)) ? [n] : []));
    const entry = { item, dinners: uses.map((n) => scheduled[n].name) };
    if (uses.length > 1) shared.push(entry);
    else if (uses.length === 1) perDinner[uses[0]].push(entry);
    else rest.push(entry);
  }
  return [
    { title: "Shared by 2+ dinners", items: shared },
    ...scheduled.map((d, n) => ({ title: label(d), items: perDinner[n] })),
    { title: "Everything else", items: rest },
  ].filter((g) => g.items.length > 0);
}

type CostedRow = { name: string; estimate?: number; packs?: number; paid?: number };
export type PlanGroup<T> = { title: string; planId?: string; cost: number; items: { item: T; sharedWith: string[] }[] };

const EARLIER = "earlier";

/**
 * The list arranged by plan (the List's "By plan" view). Each plan's dinners name it; an item two plans share
 * stays one row but shows in both, marked with the other plan. Cost = what was paid, else estimate × packs,
 * so shared items count in each plan (plan costs can add up to more than the week's total).
 */
export function groupByPlan<T extends CostedRow>(rows: readonly T[], dinners: readonly Dinner[]): PlanGroup<T>[] {
  const scheduled = dinners.filter((d): d is Scheduled => d.dayIndex !== undefined).sort((a, b) => a.dayIndex - b.dayIndex);
  const plans: { id: string; dinners: Scheduled[]; buys: Set<string> }[] = [];
  for (const d of scheduled) {
    const id = d.planId ?? EARLIER;
    let plan = plans.find((p) => p.id === id);
    if (!plan) plans.push((plan = { id, dinners: [], buys: new Set() }));
    plan.dinners.push(d);
    for (const i of d.ingredients ?? []) if (!i.pantry) plan.buys.add(key(i.name));
  }
  // Plans in day order; dinners from before plans were tracked go last.
  plans.sort((a, b) => Number(a.id === EARLIER) - Number(b.id === EARLIER));
  const titles = plans.map((p) => (p.id === EARLIER ? "Earlier dinners" : p.dinners.map((d) => d.name).join(" + ")));

  const groups: PlanGroup<T>[] = plans.map((p, n) => ({ title: titles[n], planId: p.id === EARLIER ? undefined : p.id, cost: 0, items: [] }));
  const rest: PlanGroup<T> = { title: "Everything else", cost: 0, items: [] };
  for (const item of rows) {
    const uses = plans.flatMap((p, n) => (p.buys.has(key(item.name)) ? [n] : []));
    const cost = item.paid ?? estimateTotal(item.estimate, item.packs ?? 1) ?? 0;
    for (const n of uses) {
      groups[n].items.push({ item, sharedWith: uses.filter((m) => m !== n).map((m) => titles[m]) });
      groups[n].cost += cost;
    }
    if (uses.length === 0) {
      rest.items.push({ item, sharedWith: [] });
      rest.cost += cost;
    }
  }
  return [...groups, rest]
    .filter((g) => g.items.length > 0)
    .map((g) => ({ ...g, cost: Math.round(g.cost * 100) / 100 }));
}
