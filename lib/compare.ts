// Two Kroger-family stores, side by side, for the same list (the List's "Compare stores").

type Priced = { price: number } | null;
const cents = (n: number) => Math.round(n * 100) / 100;

/** Totals over items both stores carry (price × packs), what only one (or neither) has, and the 5 biggest differences. */
export function compareStores(rows: readonly { name: string; packs?: number }[], a: readonly Priced[], b: readonly Priced[]) {
  let totalA = 0;
  let totalB = 0;
  const onlyA: string[] = [];
  const onlyB: string[] = [];
  const neither: string[] = [];
  const pairs: { name: string; a: number; b: number }[] = [];
  rows.forEach((r, i) => {
    const packs = r.packs ?? 1;
    const pa = a[i];
    const pb = b[i];
    if (pa && pb) {
      totalA += pa.price * packs;
      totalB += pb.price * packs;
      pairs.push({ name: r.name, a: cents(pa.price * packs), b: cents(pb.price * packs) });
    } else if (pa) onlyA.push(r.name);
    else if (pb) onlyB.push(r.name);
    else neither.push(r.name);
  });
  const biggest = pairs
    .filter((d) => Math.abs(d.a - d.b) >= 0.01)
    .sort((x, y) => Math.abs(y.a - y.b) - Math.abs(x.a - x.b))
    .slice(0, 5);
  return { totalA: cents(totalA), totalB: cents(totalB), both: pairs.length, onlyA, onlyB, neither, biggest };
}
