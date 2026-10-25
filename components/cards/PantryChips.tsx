"use client";

// Pantry staples on a plan card: ✓ have it (not counted) or 🛒 need it (priced and added). Tap to flip.
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
    <div className="flex flex-col gap-2">
      <p className="text-xs font-bold text-slate-500">In your pantry? Tap anything you&apos;re out of to add it.</p>
      <div className="flex flex-wrap gap-2">
        {names.map((name) => {
          const need = needed.has(name.toLowerCase());
          const busy = loading.has(name.toLowerCase());
          return (
            <button
              key={name}
              type="button"
              onClick={() => onToggle(name)}
              disabled={busy}
              aria-pressed={need}
              className={`rounded-full border-2 px-3 py-1.5 text-sm font-bold ${
                need ? "border-carrot bg-carrot/10 text-carrot-dark" : "border-leaf bg-leaf/10 text-leaf-dark"
              } disabled:opacity-60`}
            >
              {busy ? "…" : need ? "🛒" : "✓"} {name}
              <span className="sr-only">{need ? " (need to buy)" : " (have it)"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
