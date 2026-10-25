"use client";

import { useEffect, useState } from "react";
import type { Doc } from "@/convex/_generated/dataModel";
import { Scale } from "lucide-react";
import { fetchPrices } from "@/lib/kroger-client";
import { compareStores } from "@/lib/compare";
import { formatMoney } from "@/lib/tally";

type Store = { id: string; name: string };
const short = (name: string) => name.split(" · ")[0] + (name.includes(" · ") ? ` (${name.split(" · ")[1].split(" (")[0]})` : "");

// Prices the unpaid list at two Kroger-family stores and shows them side by side.
export default function CompareStores({ items, defaultStoreId }: { items: Doc<"listItems">[]; defaultStoreId?: string }) {
  const [open, setOpen] = useState(false);
  const [stores, setStores] = useState<Store[] | null>(null);
  const [a, setA] = useState(defaultStoreId ?? "");
  const [b, setB] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<(ReturnType<typeof compareStores> & { nameA: string; nameB: string }) | null>(null);

  useEffect(() => {
    if (!open || stores) return;
    fetch("/api/stores")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((body: { stores: Store[] }) => {
        setStores(body.stores);
        const saved = localStorage.getItem("compareStore");
        const first = a || body.stores[0]?.id || "";
        setA(first);
        // Remembered pick, else the nearest store from the other chain, else the next store.
        const chain = (s: Store) => s.name.split(" · ")[0];
        const firstChain = body.stores.find((s) => s.id === first);
        const other = body.stores.find((s) => s.id !== first && firstChain && chain(s) !== chain(firstChain)) ?? body.stores.find((s) => s.id !== first);
        setB(saved && saved !== first && body.stores.some((s) => s.id === saved) ? saved : (other?.id ?? ""));
      })
      .catch(() => setError("Couldn't load Kroger stores. Try again?"));
  }, [open, stores, a]);

  const unpaid = items.filter((i) => i.paid === undefined).slice(0, 50);

  async function run() {
    const storeA = stores?.find((s) => s.id === a);
    const storeB = stores?.find((s) => s.id === b);
    if (!storeA || !storeB || a === b) return setError("Pick two different stores.");
    localStorage.setItem("compareStore", b);
    setError(null);
    setResult(null);
    const asked = unpaid.map((i) => ({ name: i.name, productId: i.productId }));
    // One store at a time: a burst of Kroger lookups once got the connection blocked.
    setBusy(`Pricing ${unpaid.length} items at ${short(storeA.name)}…`);
    const pricesA = await fetchPrices(asked, a);
    setBusy(`Pricing ${unpaid.length} items at ${short(storeB.name)}…`);
    const pricesB = await fetchPrices(asked, b);
    setBusy(null);
    if (pricesA.every((p) => !p) && pricesB.every((p) => !p)) return setError("Couldn't reach Kroger for prices. Try again in a minute.");
    setResult({ ...compareStores(unpaid, pricesA, pricesB), nameA: short(storeA.name), nameB: short(storeB.name) });
  }

  if (unpaid.length === 0) return null;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-crate self-start">
        <Scale size={17} strokeWidth={2.75} aria-hidden /> Compare stores
      </button>
    );
  }

  const cheaper = result && result.totalA !== result.totalB ? (result.totalA < result.totalB ? result.nameA : result.nameB) : null;
  return (
    <section className="crate flex flex-col gap-3 p-4" aria-label="Compare stores">
      <h2 className="font-sign text-lg">Compare stores</h2>
      {stores ? (
        <div className="flex flex-col gap-1.5">
          {[a, b].map((value, n) => (
            <div key={n} className="flex flex-col gap-1.5">
              {n === 1 && <span className="text-center text-sm font-black text-ink-soft">vs</span>}
              <select
                value={value}
                onChange={(e) => (n === 0 ? setA : setB)(e.target.value)}
                aria-label={n === 0 ? "First store" : "Second store"}
                className="field w-full"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>{short(s.name)}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      ) : (
        !error && <p className="text-sm font-bold text-ink-soft">Loading stores…</p>
      )}
      <button type="button" onClick={run} disabled={!!busy || !stores} className="btn-press self-start">
        {busy ? "Comparing…" : `Compare ${unpaid.length} unpaid items`}
      </button>
      {busy && <p role="status" className="text-sm font-bold text-ink-soft">{busy}</p>}
      {error && <p role="alert" className="text-sm font-bold text-tomato-dark">{error}</p>}

      {result && (
        <div className="flex flex-col gap-3" role="status">
          <div className="grid grid-cols-2 gap-2 text-center">
            {[
              [result.nameA, result.totalA],
              [result.nameB, result.totalB],
            ].map(([name, total]) => (
              <div key={name as string} className={`rounded-2xl border-2 p-3 ${cheaper === name ? "border-ink" : "border-line"}`}>
                <p className="truncate text-xs font-extrabold uppercase text-ink-soft">{name}</p>
                <p className={`text-2xl ${cheaper === name ? "font-black" : "font-bold"}`}>{formatMoney(total as number)}</p>
              </div>
            ))}
          </div>
          <p className="font-bold">
            {cheaper
              ? `${cheaper} is ${formatMoney(Math.abs(result.totalA - result.totalB))} cheaper for the ${result.both} items both carry.`
              : `Same total for the ${result.both} items both carry.`}
          </p>
          {result.biggest.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm font-bold">
              {result.biggest.map((d) => (
                <li key={d.name} className="flex justify-between gap-2">
                  <span className="truncate">{d.name}</span>
                  <span className="shrink-0 text-ink-soft">{formatMoney(d.a)} vs {formatMoney(d.b)}</span>
                </li>
              ))}
            </ul>
          )}
          {result.onlyA.length > 0 && <p className="text-sm font-bold text-ink-soft">Only at {result.nameA}: {result.onlyA.join(", ")}</p>}
          {result.onlyB.length > 0 && <p className="text-sm font-bold text-ink-soft">Only at {result.nameB}: {result.onlyB.join(", ")}</p>}
          {result.neither.length > 0 && <p className="text-sm font-bold text-ink-soft">Not found at either: {result.neither.join(", ")}</p>}
        </div>
      )}
    </section>
  );
}
