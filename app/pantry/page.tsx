"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Check, ShoppingBasket, X } from "lucide-react";
import RegularsSection from "@/components/RegularsSection";

// What's in your pantry, remembered across weeks. The crew reads this when it plans.
export default function PantryPage() {
  const pantry = useQuery(api.pantry.mine);
  const setHave = useMutation(api.pantry.setHave);
  const remove = useMutation(api.pantry.remove);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    try {
      await setHave({ name, have: true });
      setName("");
    } catch {
      setError("Couldn't add that. Try again.");
    }
  }

  if (pantry === undefined) return null;
  const out = pantry.filter((p) => !p.have);

  return (
    // Laptop: pantry and regulars side by side. Phone: pantry, then regulars.
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
      <div className="flex flex-col gap-4">
      <header>
        <h1 className="sign">My Pantry</h1>
        <p className="mt-1 font-bold text-ink-soft">
          The crew won&apos;t buy what you have, and adds what you&apos;re out of.
          {out.length > 0 && ` Out of ${out.length}.`}
        </p>
      </header>

      <form onSubmit={add} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add a staple, like soy sauce"
          maxLength={60}
          aria-label="Add a pantry staple"
          className="field min-w-0 flex-1 rounded-2xl px-4 py-3 text-base"
        />
        <button disabled={!name.trim()} className="btn-press px-5">
          Add
        </button>
      </form>
      {error && <p className="font-bold text-tomato-dark" role="alert">{error}</p>}

      {pantry.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-line p-5 text-center font-bold text-ink-soft">
          Nothing here yet. Add staples above, or tap pantry items on a meal plan card.
        </p>
      ) : (
        <ul className="crate px-4">
          {pantry.map((item) => (
            <li key={item._id} className="row-rule flex items-center gap-3 py-3">
              <span className="flex-1 text-lg font-black capitalize">{item.name}</span>
              <button
                type="button"
                onClick={() => setHave({ name: item.name, have: !item.have })}
                aria-pressed={!item.have}
                aria-label={`${item.name}: ${item.have ? "have it" : "out, buy it"}. Tap to switch.`}
                className={`stamp text-xs ${item.have ? "ink" : "tagged"}`}
              >
                {item.have ? <Check size={14} strokeWidth={3.5} aria-hidden /> : <ShoppingBasket size={14} strokeWidth={3} aria-hidden />}
                {item.have ? "Have" : "Out · buy"}
              </button>
              <button
                type="button"
                onClick={() => remove({ id: item._id })}
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-line"
                aria-label={`Remove ${item.name}`}
              >
                <X size={16} strokeWidth={3} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      </div>
      <RegularsSection />
    </div>
  );
}
