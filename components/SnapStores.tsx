"use client";

import { useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import type { SnapStore } from "@/lib/snap-stores";

// For SNAP households: other stores near their Kroger store that take SNAP (USDA's retailer list), opened on demand.
export default function SnapStores({ storeId }: { storeId: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{ near?: string; stores?: SnapStore[]; error?: string } | null>(null);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !data) {
      const res = await fetch(`/api/snap-stores?storeId=${storeId}`).catch(() => null);
      setData(((await res?.json().catch(() => null)) as typeof data) ?? { error: "Couldn't load SNAP stores." });
    }
  }

  return (
    <section className="crate flex flex-col gap-2 p-3">
      <button type="button" onClick={toggle} aria-expanded={open} className="flex items-center justify-between gap-2 text-left font-black">
        <span className="flex items-center gap-2"><MapPin size={18} strokeWidth={2.75} aria-hidden /> Other stores near you that take SNAP</span>
        <ChevronDown size={18} strokeWidth={3} className={open ? "rotate-180" : ""} aria-hidden />
      </button>
      {open && !data && <p className="text-sm font-bold text-ink-soft" role="status">Checking USDA&apos;s SNAP store list…</p>}
      {open && data?.error && <p className="text-sm font-bold text-tomato-dark" role="alert">{data.error}</p>}
      {open && data?.stores && (
        <>
          {data.stores.length === 0 ? (
            <p className="text-sm font-bold text-ink-soft">No grocery stores taking SNAP within 3 miles.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {data.stores.map((s) => (
                <li key={`${s.name}-${s.address}`} className="flex items-baseline justify-between gap-3 border-t-2 border-line pt-1.5 first:border-0 first:pt-0">
                  <span className="min-w-0">
                    <span className="block font-extrabold">{s.name}</span>
                    <span className="block text-xs text-ink-soft">{s.address} · {s.type}{s.incentive ? ` · ${s.incentive}` : ""}</span>
                  </span>
                  <span className="shrink-0 text-xs font-extrabold text-ink-soft">{s.miles} mi</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs font-bold text-ink-soft">Within 3 miles of {data.near}. From USDA&apos;s SNAP Retailer Locator. Mise prices only Kroger stores, so prices aren&apos;t shown here.</p>
        </>
      )}
    </section>
  );
}
