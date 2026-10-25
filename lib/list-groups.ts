// The shopping list arranged by dinner (the List's "By dinner" view). Same rows, just grouped:
// an item merged across dinners (one 3-pack of chicken) shows once, in "Shared", naming its dinners.
import { key } from "./meal-plan";

type Dinner = { name: string; dayIndex?: number; ingredients?: { name: string; pantry: boolean }[] };
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
