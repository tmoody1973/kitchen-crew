"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import Link from "next/link";
import { describeHousehold, formatServings, targetServings } from "@/lib/household";
import { maxAllotment, weeklyShare } from "@/lib/snap";
import { DEFAULT_MEMBERS, peopleIn } from "@/lib/usda";
import { Minus, Plus } from "lucide-react";

// How big the crew makes each dinner. Saved right away.
export default function HouseholdSettings() {
  const household = useQuery(api.household.mine);
  const save = useMutation(api.household.save);
  const setSnap = useMutation(api.household.setSnap);
  const [snapText, setSnapText] = useState<string | null>(null);
  if (!household) return null;
  const members = household.members ?? DEFAULT_MEMBERS;
  const snapOn = household.snapMonthly !== undefined;
  const saveSnap = (text: string) => {
    const n = Number(text.replace("$", ""));
    if (Number.isFinite(n) && n > 0) setSnap({ snapMonthly: Math.round(n) }).catch(() => {});
  };
  const set = (servings: number, leftovers: boolean) => save({ servings, leftovers });

  return (
    <section className="ruled flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="sign text-2xl">Household</h2>
        <Link href="/welcome?edit" className="text-sm font-extrabold underline">Change name or who&apos;s eating</Link>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-bold">Servings per dinner</p>
          <p className="text-sm text-ink-soft">{describeHousehold(members).replace(/ \(.*?\)/g, "")}; teens count as 1½</p>
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
      <label className="flex items-center justify-between gap-3 font-bold">
        <span>
          We use SNAP (EBT)
          <span className="block text-sm font-normal text-ink-soft">The list marks SNAP-eligible items and the tally splits SNAP and cash</span>
        </span>
        <input
          type="checkbox"
          checked={snapOn}
          onChange={(e) => setSnap({ snapMonthly: e.target.checked ? maxAllotment(peopleIn(members)) : undefined }).catch(() => {})}
          className="check"
        />
      </label>
      <Link href="/food-help" className="text-sm font-extrabold underline">Food help near you: pantries, free meals, WIC, school meals</Link>
      {snapOn && (
        <label className="flex items-center justify-between gap-3 text-sm font-bold">
          <span>
            Monthly SNAP benefit
            <span className="block font-normal text-ink-soft">About ${weeklyShare(household.snapMonthly!)} a week</span>
          </span>
          <input
            inputMode="decimal"
            value={snapText ?? String(household.snapMonthly)}
            onChange={(e) => setSnapText(e.target.value)}
            onBlur={(e) => { saveSnap(e.target.value); setSnapText(null); }}
            aria-label="Monthly SNAP benefit in dollars"
            className="field w-28 px-2 py-1.5 text-right text-base"
          />
        </label>
      )}
    </section>
  );
}
