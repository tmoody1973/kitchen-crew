"use client";

import { Check, LoaderCircle, ShoppingBasket } from "lucide-react";

// Pantry staples on a plan card: have it (not counted) or need it (priced and added). Tap to flip.
export default function PantryChips({
  names,
  needed,
  loading,
  onToggle,
}: {
  names: string[];
  needed: ReadonlySet<string>;
  loading: ReadonlySet<string>;
  onToggle: (name: string) => void;
}) {
  if (names.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 border-t-2 border-dashed border-line pt-3">
      <p className="text-sm font-bold text-ink-soft">In your pantry? Tap anything you&apos;re out of to buy it.</p>
      <div className="flex flex-wrap gap-2">
        {names.map((name) => {
          const need = needed.has(name.toLowerCase());
          const busy = loading.has(name.toLowerCase());
          const Icon = busy ? LoaderCircle : need ? ShoppingBasket : Check;
          return (
            <button
              key={name}
              type="button"
              onClick={() => onToggle(name)}
              disabled={busy}
              aria-pressed={need}
              className={`flex items-center gap-1.5 rounded-full border-2 border-ink px-3 py-1.5 text-sm font-extrabold disabled:opacity-60 ${
                need ? "bg-tag text-ink" : "bg-white text-ink"
              }`}
            >
              <Icon size={14} strokeWidth={3} className={busy ? "animate-spin" : ""} aria-hidden />
              {name}
              <span className="sr-only">{need ? " (need to buy)" : " (have it)"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
