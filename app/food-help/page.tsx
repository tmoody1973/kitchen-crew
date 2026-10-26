"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import FoodHelpCard, { type FoodHelpResult } from "@/components/FoodHelpCard";
import type { HelpMode } from "@/lib/food-help";

const MODES: { mode: HelpMode; label: string }[] = [
  { mode: "free", label: "Free food" },
  { mode: "school", label: "School meals" },
  { mode: "summer", label: "Summer meals" },
  { mode: "wic", label: "WIC" },
];

// Help covering food costs: pantries, free meals, school meal sites, WIC near a ZIP (Feed America's directory).
export default function FoodHelpPage() {
  const [zip, setZip] = useState("");
  const [mode, setMode] = useState<HelpMode>("free");
  const [result, setResult] = useState<FoodHelpResult | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (z: string, m: HelpMode) => {
    setLoading(true);
    const res = await fetch(`/api/food-help?${new URLSearchParams({ zip: z, mode: m })}`).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { zip?: string; mode?: HelpMode; places?: FoodHelpResult extends { places: infer P } ? P : never; error?: string } | null;
    setResult(data?.places ? { ok: true, zip: data.zip!, mode: data.mode!, places: data.places } : { ok: false, error: data?.error ?? "Couldn't load food help." });
    if (data?.zip) setZip(data.zip);
    setLoading(false);
  }, []);

  useEffect(() => {
    load("", "free");
  }, [load]);

  function search(e: FormEvent) {
    e.preventDefault();
    if (/^\d{5}$/.test(zip)) load(zip, mode);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="sign">Food help near you</h1>
      <p className="font-bold text-ink-soft">
        When the budget runs short, these places can help: food pantries, free meals, school meal sites, and WIC. No shame in it; that&apos;s what they&apos;re for.
      </p>
      <form onSubmit={search} className="flex flex-wrap items-center gap-2">
        <input value={zip} onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))} inputMode="numeric" placeholder="ZIP code" aria-label="ZIP code" className="field w-32 px-3 py-2 text-base" />
        <button type="submit" className="btn-press">Search</button>
      </form>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="What kind of help">
        {MODES.map((m) => (
          <button
            key={m.mode}
            type="button"
            role="radio"
            aria-checked={mode === m.mode}
            onClick={() => {
              setMode(m.mode);
              if (/^\d{5}$/.test(zip)) load(zip, m.mode);
            }}
            className={`rounded-full border-2 border-ink px-3 py-1 text-sm font-black ${mode === m.mode ? "bg-ink text-chalk" : "bg-white"}`}
          >
            {m.label}
          </button>
        ))}
      </div>
      {loading && <p className="font-bold text-ink-soft" role="status">Looking for help near you…</p>}
      {!loading && result && <FoodHelpCard data={result} />}
    </div>
  );
}
