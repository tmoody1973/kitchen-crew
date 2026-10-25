"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatMoney, isWeekActive, suggestExtras } from "@/lib/tally";

// Splits the weekly budget into a Dinners share and an Extras share.
export default function ExtrasSplit() {
  const week = useQuery(api.weeks.latest);
  const regulars = useQuery(api.regulars.mine);
  const setExtras = useMutation(api.weeks.setExtras);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!week || !regulars || !isWeekActive(week.startDate, Date.now())) return null;

  const current = week.extrasBudget ?? 0;
  const suggested = suggestExtras(regulars);
  const value = text ?? String(current);

  async function save(amount: number) {
    setError(null);
    try {
      await setExtras({ extrasBudget: amount });
      setText(null);
    } catch {
      setError(`Extras must be between $0 and ${formatMoney(week!.budget)}.`);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">Dinners and extras</h2>
      <p className="font-bold text-slate-500">
        Set aside part of {formatMoney(week.budget)} for snacks, drinks, and fruit, so the crew plans dinners with the rest.
      </p>
      <div className="flex items-center gap-2 font-black">
        <span>Extras $</span>
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => text !== null && save(Number(text) || 0)}
          className="w-24 rounded-xl border-2 border-slate-200 px-3 py-2 text-lg"
          aria-label="Extras budget in dollars"
        />
        <span className="text-slate-500">· Dinners {formatMoney(Math.max(0, week.budget - (Number(value) || 0)))}</span>
      </div>
      {suggested > 0 && suggested !== current && (
        <button type="button" onClick={() => save(Math.min(suggested, week.budget))} className="self-start font-bold text-leaf-dark underline">
          Use {formatMoney(suggested)}, your regulars&apos; total
        </button>
      )}
      {error && <p className="font-bold text-carrot-dark">{error}</p>}
    </section>
  );
}
