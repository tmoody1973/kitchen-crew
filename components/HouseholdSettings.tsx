"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatServings, targetServings } from "@/lib/household";

// How big the crew makes each dinner. Saved right away.
export default function HouseholdSettings() {
  const household = useQuery(api.household.mine);
  const save = useMutation(api.household.save);
  if (!household) return null;
  const set = (servings: number, leftovers: boolean) => save({ servings, leftovers });

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">Household</h2>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-bold">Servings per dinner</p>
          <p className="text-sm text-slate-500">2 adults + a teen who eats like 1½ = 3½</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => set(household.servings - 0.5, household.leftovers)}
            disabled={household.servings <= 1}
            className="h-10 w-10 rounded-full border-2 border-slate-200 font-black disabled:opacity-40"
            aria-label="Half a serving less"
          >
            −
          </button>
          <span className="w-10 text-center text-xl font-black">{formatServings(household.servings)}</span>
          <button
            type="button"
            onClick={() => set(household.servings + 0.5, household.leftovers)}
            disabled={household.servings >= 12}
            className="h-10 w-10 rounded-full border-2 border-slate-200 font-black disabled:opacity-40"
            aria-label="Half a serving more"
          >
            +
          </button>
        </div>
      </div>
      <label className="flex items-center justify-between gap-3 font-bold">
        <span>
          Plan leftovers for lunch
          <span className="block text-sm font-normal text-slate-500">
            Dinners will make {formatServings(targetServings({ ...household, leftovers: true }))} servings
          </span>
        </span>
        <input
          type="checkbox"
          checked={household.leftovers}
          onChange={(e) => set(household.servings, e.target.checked)}
          className="h-6 w-6 accent-[var(--color-leaf)]"
        />
      </label>
    </section>
  );
}
