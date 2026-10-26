"use client";

import { FormEvent, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { fetchOptions, Product } from "@/lib/kroger-client";
import { formatMoney } from "@/lib/tally";

// The top Kroger matches for an item (brand · size · price); tap one to use it.
// The search box starts as the item's name; edit it when the matches are wrong ("petite diced tomatoes").
export default function ProductPicker({
  name,
  storeId,
  currentId,
  onPick,
  onClose,
}: {
  name: string;
  storeId: string;
  currentId?: string;
  onPick: (p: Product) => void;
  onClose: () => void;
}) {
  const [options, setOptions] = useState<Product[] | null>(null);
  const [query, setQuery] = useState(name);
  const [searched, setSearched] = useState(name);

  useEffect(() => {
    let current = true; // a slower earlier search must not replace newer results
    setOptions(null);
    fetchOptions(searched, storeId).then((o) => current && setOptions(o));
    return () => {
      current = false;
    };
  }, [searched, storeId]);

  function search(e: FormEvent) {
    e.preventDefault();
    const q = query.trim().slice(0, 80);
    if (q) setSearched(q);
  }

  return (
    <div className="crate flex flex-col gap-2 p-2">
      <form onSubmit={search} role="search" className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          enterKeyHint="search"
          maxLength={80}
          aria-label={`Search the store for ${name}`}
          className="field min-w-0 flex-1 px-3 py-2 text-base"
        />
        <button type="submit" className="btn-crate shrink-0 px-3 py-2 text-sm">
          <Search size={16} strokeWidth={3} aria-hidden /> Search
        </button>
      </form>
      {options === null && <p className="p-2 text-sm font-bold text-ink-soft">Finding options…</p>}
      {options?.length === 0 && <p className="p-2 text-sm font-bold text-ink-soft">Nothing for &ldquo;{searched}&rdquo; at this store. Try other words.</p>}
      {options?.map((p) => (
        <button
          key={p.productId}
          type="button"
          onClick={() => onPick(p)}
          aria-pressed={p.productId === currentId}
          className={`flex items-center justify-between gap-3 rounded-xl border-2 p-3 text-left ${p.productId === currentId ? "border-ink bg-tag/40" : "border-line hover:border-ink"}`}
        >
          {p.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- tiny Kroger thumbnail
            <img src={p.imageUrl} alt="" width={40} height={40} className="h-10 w-10 shrink-0 object-contain" />
          )}
          <span className="min-w-0 flex-1 text-sm font-bold">
            {p.name}
            {p.size && <span className="text-ink-soft"> · {p.size}</span>}
            {p.regularPrice && <span className="block text-xs font-extrabold text-kale-ink">On sale · was {formatMoney(p.regularPrice)}</span>}
          </span>
          <span className="tag shrink-0 text-sm">{formatMoney(p.price)}</span>
        </button>
      ))}
      <button type="button" onClick={onClose} className="p-2 text-sm font-bold text-ink-soft underline">
        Keep current
      </button>
    </div>
  );
}
