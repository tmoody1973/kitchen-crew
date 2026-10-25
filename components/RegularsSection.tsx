"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { fetchPrices } from "@/lib/kroger-client";
import { formatMoney } from "@/lib/tally";
import ProductPicker from "./ProductPicker";
import { Minus, Plus, X } from "lucide-react";

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
    <section className="ruled flex flex-col gap-3">
      <div>
        <h2 className="sign text-2xl">Regulars</h2>
        <p className="font-bold text-ink-soft">Things you buy most weeks. They go on the list as extras.</p>
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Sparkling water, chips…"
          aria-label="Add a regular"
          maxLength={80}
          className="field min-w-0 flex-1 rounded-2xl px-4 py-2"
        />
        <button disabled={busy || !name.trim()} className="btn-press px-4 py-2">
          {busy ? "…" : "Add"}
        </button>
      </form>
      {error && <p className="font-bold text-tomato-dark" role="alert">{error}</p>}
      {regulars.length > 0 && <ul className="border-y-2 border-dashed border-line">
        {regulars.map((r) => (
          <li key={r._id} className="row-rule flex flex-col gap-2 py-3">
          <div className="flex items-center gap-2">
            {r.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- tiny Kroger thumbnail
              <img src={r.imageUrl} alt="" width={36} height={36} className="h-9 w-9 rounded-lg object-contain" />
            )}
            <span className="min-w-0 flex-1 truncate font-bold capitalize">{r.name}</span>
            <button type="button" onClick={() => remove({ id: r._id })} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-line" aria-label={`Remove ${r.name}`}><X size={15} strokeWidth={3} aria-hidden /></button>
          </div>
          <div className="flex items-center gap-2">
            {r.estimate !== undefined ? <span className="tag text-xs">{formatMoney(r.estimate * r.packs)}</span> : <span className="text-xs font-bold text-ink-soft">no price</span>}
            <span className="ml-auto flex items-center gap-1.5">
              <button type="button" onClick={() => setPacks({ id: r._id, packs: r.packs - 1 })} disabled={r.packs <= 1} className="btn-round h-8 w-8" aria-label={`One fewer ${r.name}`}><Minus size={14} strokeWidth={3} aria-hidden /></button>
              <span className="font-sign w-7 text-center">×{r.packs}</span>
              <button type="button" onClick={() => setPacks({ id: r._id, packs: r.packs + 1 })} className="btn-round h-8 w-8" aria-label={`One more ${r.name}`}><Plus size={14} strokeWidth={3} aria-hidden /></button>
            </span>
          </div>
          <div className="flex items-center gap-3 pl-1 text-xs font-bold text-ink-soft">
            {r.productName && <span className="min-w-0 truncate">{r.productName}{r.size ? ` · ${r.size}` : ""}</span>}
            {week?.storeId && (
              <button type="button" onClick={() => setPicking(picking === r._id ? null : r._id)} className="shrink-0 text-ink underline">
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
      </ul>}
      <label className="flex items-center justify-between gap-3 font-bold">
        Add regulars to each new week automatically
        <input
          type="checkbox"
          checked={household.autoRegulars}
          onChange={(e) => saveHousehold({ servings: household.servings, leftovers: household.leftovers, autoRegulars: e.target.checked })}
          className="check"
        />
      </label>
    </section>
  );
}
