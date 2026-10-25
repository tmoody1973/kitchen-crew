"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { fetchPrices } from "@/lib/kroger-client";
import { formatMoney } from "@/lib/tally";
import ProductPicker from "./ProductPicker";

// Things bought most weeks, priced at the current store, added to the list as extras.
export default function RegularsSection() {
  const regulars = useQuery(api.regulars.mine);
  const week = useQuery(api.weeks.latest);
  const household = useQuery(api.household.mine);
  const add = useMutation(api.regulars.add);
  const setPacks = useMutation(api.regulars.setPacks);
  const remove = useMutation(api.regulars.remove);
  const saveHousehold = useMutation(api.household.save);
  const setProduct = useMutation(api.regulars.setProduct);
  const [picking, setPicking] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    setError(null);
    try {
      const [product] = week?.storeId ? await fetchPrices([{ name: n }], week.storeId) : [null];
      await add({
        name: n,
        product: product
          ? { productId: product.productId, name: product.name, size: product.size, price: product.price, imageUrl: product.imageUrl }
          : undefined,
      });
      setName("");
    } catch {
      setError("Couldn't add that. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!regulars || !household) return null;
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-white p-4">
      <div>
        <h2 className="text-xl font-black">Regulars</h2>
        <p className="font-bold text-slate-500">Things you buy most weeks. They go on the list as 🛒 extras.</p>
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Sparkling water, bananas, chips…"
          maxLength={80}
          className="min-w-0 flex-1 rounded-2xl border-2 border-slate-200 px-4 py-2 font-bold"
        />
        <button disabled={busy || !name.trim()} className="rounded-2xl bg-leaf px-4 font-black text-white disabled:opacity-60">
          {busy ? "…" : "Add"}
        </button>
      </form>
      {error && <p className="font-bold text-carrot-dark">{error}</p>}
      <ul className="flex flex-col gap-2">
        {regulars.map((r) => (
          <li key={r._id} className="flex flex-col gap-2 rounded-xl bg-slate-50 p-2">
          <div className="flex items-center gap-2">
            {r.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- tiny Kroger thumbnail
              <img src={r.imageUrl} alt="" width={36} height={36} className="h-9 w-9 rounded-lg object-contain" />
            )}
            <span className="min-w-0 flex-1 truncate font-bold capitalize">{r.name}</span>
            <span className="text-sm font-bold text-slate-500">{r.estimate !== undefined ? formatMoney(r.estimate * r.packs) : "no price"}</span>
            <button type="button" onClick={() => setPacks({ id: r._id, packs: r.packs - 1 })} disabled={r.packs <= 1} className="h-8 w-8 rounded-full border-2 border-slate-200 font-black disabled:opacity-40" aria-label={`One fewer ${r.name}`}>−</button>
            <span className="w-7 text-center font-black">×{r.packs}</span>
            <button type="button" onClick={() => setPacks({ id: r._id, packs: r.packs + 1 })} className="h-8 w-8 rounded-full border-2 border-slate-200 font-black" aria-label={`One more ${r.name}`}>+</button>
            <button type="button" onClick={() => remove({ id: r._id })} className="px-2 text-slate-400" aria-label={`Remove ${r.name}`}>✕</button>
          </div>
          <div className="flex items-center gap-3 pl-1 text-xs font-bold text-slate-500">
            {r.productName && <span className="min-w-0 truncate">{r.productName}{r.size ? ` · ${r.size}` : ""}</span>}
            {week?.storeId && (
              <button type="button" onClick={() => setPicking(picking === r._id ? null : r._id)} className="shrink-0 text-leaf-dark underline">
                {r.productId ? "Change brand" : "Find at Kroger"}
              </button>
            )}
          </div>
          {picking === r._id && week?.storeId && (
            <ProductPicker
              name={r.name}
              storeId={week.storeId}
              currentId={r.productId}
              onPick={(p) => {
                setPicking(null);
                setProduct({ id: r._id, product: { productId: p.productId, name: p.name, size: p.size, price: p.price, imageUrl: p.imageUrl } });
              }}
              onClose={() => setPicking(null)}
            />
          )}
          </li>
        ))}
      </ul>
      <label className="flex items-center justify-between gap-3 font-bold">
        Add regulars to each new week automatically
        <input
          type="checkbox"
          checked={household.autoRegulars}
          onChange={(e) => saveHousehold({ servings: household.servings, leftovers: household.leftovers, autoRegulars: e.target.checked })}
          className="h-6 w-6 accent-[var(--color-leaf)]"
        />
      </label>
    </section>
  );
}
