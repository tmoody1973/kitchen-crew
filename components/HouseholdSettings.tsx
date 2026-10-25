"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatServings, targetServings } from "@/lib/household";
import { Minus, Plus } from "lucide-react";

// How big the crew makes each dinner. Saved right away.
export default function HouseholdSettings() {
  const household = useQuery(api.household.mine);
  const save = useMutation(api.household.save);
  if (!household) return null;
  const set = (servings: number, leftovers: boolean) => save({ servings, leftovers });

  return (
    <section className="ruled flex flex-col gap-3">
      <h2 className="sign text-2xl">Household</h2>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-bold">Servings per dinner</p>
          <p className="text-sm text-ink-soft">2 adults + a teen who eats like 1½ = 3½</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => set(household.servings - 0.5, household.leftovers)}
            disabled={household.servings <= 1}
            className="btn-round"
            aria-label="Half a serving less"
          >
            <Minus size={16} strokeWidth={3} aria-hidden />
          </button>
          <span className="font-sign w-10 text-center text-xl">{formatServings(household.servings)}</span>
          <button
            type="button"
            onClick={() => set(household.servings + 0.5, household.leftovers)}
            disabled={household.servings >= 12}
            className="btn-round"
            aria-label="Half a serving more"
          >
            <Plus size={16} strokeWidth={3} aria-hidden />
          </button>
        </div>
      </div>
      <label className="flex items-center justify-between gap-3 font-bold">
        <span>
          Plan leftovers for lunch
          <span className="block text-sm font-normal text-ink-soft">
            Dinners will make {formatServings(targetServings({ ...household, leftovers: true }))} servings
          </span>
        </span>
        <input
          type="checkbox"
          checked={household.leftovers}
          onChange={(e) => set(household.servings, e.target.checked)}
          className="check"
        />
      </label>
    </section>
  );
}
