"use client";

import { useEffect, useState } from "react";
import { fetchOptions, Product } from "@/lib/kroger-client";
import { formatMoney } from "@/lib/tally";

// The top Kroger matches for an item (brand · size · price); tap one to use it.
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

  useEffect(() => {
    fetchOptions(name, storeId).then(setOptions);
  }, [name, storeId]);

  return (
    <div className="crate flex flex-col gap-2 p-2">
      {options === null && <p className="p-2 text-sm font-bold text-ink-soft">Finding options…</p>}
      {options?.length === 0 && <p className="p-2 text-sm font-bold text-ink-soft">No other options at this store.</p>}
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
