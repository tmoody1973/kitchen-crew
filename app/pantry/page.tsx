"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

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
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-white p-4">
        <h1 className="text-2xl font-black">My Pantry</h1>
        <p className="font-bold text-slate-500">
          The crew won&apos;t buy what you have, and adds what you&apos;re out of.
          {out.length > 0 && ` Out of ${out.length}.`}
        </p>
      </div>

      <form onSubmit={add} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add a staple, like soy sauce"
          maxLength={60}
          className="min-w-0 flex-1 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-lg font-bold"
        />
        <button
          disabled={!name.trim()}
          className="rounded-2xl border-b-4 border-leaf-dark bg-leaf px-5 font-black text-white disabled:opacity-60"
        >
          Add
        </button>
      </form>
      {error && <p className="font-bold text-carrot-dark">{error}</p>}

      {pantry.length === 0 ? (
        <p className="rounded-2xl bg-white p-4 text-center font-bold text-slate-500">
          Nothing here yet. Add staples above, or tap pantry items on a meal plan card.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {pantry.map((item) => (
            <li
              key={item._id}
              className={`flex items-center gap-3 rounded-2xl border-2 p-3 ${item.have ? "border-leaf bg-leaf/10" : "border-carrot bg-carrot/10"}`}
            >
              <span className="flex-1 text-lg font-black capitalize">{item.name}</span>
              <button
                type="button"
                onClick={() => setHave({ name: item.name, have: !item.have })}
                aria-pressed={!item.have}
                className={`rounded-full px-3 py-2 text-sm font-black ${item.have ? "text-leaf-dark" : "text-carrot-dark"}`}
              >
                {item.have ? "✓ Have it" : "🛒 Out"}
              </button>
              <button
                type="button"
                onClick={() => remove({ id: item._id })}
                className="rounded-full px-3 py-2 text-slate-400 hover:bg-slate-100"
                aria-label={`Remove ${item.name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
