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
    <div className="flex flex-col gap-2 rounded-xl bg-white p-2">
      {options === null && <p className="p-2 text-sm font-bold text-slate-500">Finding options…</p>}
      {options?.length === 0 && <p className="p-2 text-sm font-bold text-slate-500">No other options at this store.</p>}
      {options?.map((p) => (
        <button
          key={p.productId}
          type="button"
          onClick={() => onPick(p)}
          className={`flex items-center justify-between gap-3 rounded-xl border-2 p-3 text-left ${p.productId === currentId ? "border-leaf" : "border-slate-200"}`}
        >
          {p.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- tiny Kroger thumbnail
            <img src={p.imageUrl} alt="" width={40} height={40} className="h-10 w-10 shrink-0 object-contain" />
          )}
          <span className="min-w-0 flex-1 text-sm font-bold">
            {p.name}
            {p.size && <span className="text-slate-500"> · {p.size}</span>}
          </span>
          <span className="shrink-0 font-black">{formatMoney(p.price)}</span>
        </button>
      ))}
      <button type="button" onClick={onClose} className="p-2 text-sm font-bold text-slate-500">
        Keep current
      </button>
    </div>
  );
}
