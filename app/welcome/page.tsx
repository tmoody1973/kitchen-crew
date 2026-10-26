"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Minus, Plus } from "lucide-react";
import { formatServings, servingsFor } from "@/lib/household";
import { PLAN_LABELS, peopleIn, suggestedBudget, type Members, type PlanLevel } from "@/lib/usda";
import { maxAllotment, weeklyShare } from "@/lib/snap";
import { formatMoney } from "@/lib/tally";

const GROUPS: { key: keyof Members; label: string; note: string }[] = [
  { key: "men", label: "Men", note: "19+" },
  { key: "women", label: "Women", note: "19+" },
  { key: "teenBoys", label: "Teen boys", note: "12–18" },
  { key: "teenGirls", label: "Teen girls", note: "12–18" },
  { key: "kids", label: "Kids", note: "6–11" },
  { key: "littleKids", label: "Little kids", note: "1–5" },
];
const LEVELS: { level: PlanLevel; blurb: string }[] = [
  { level: "thrifty", blurb: "Tight: store brands, cooking from scratch" },
  { level: "low", blurb: "Sensible everyday shopping" },
  { level: "moderate", blurb: "Some convenience and premium items" },
];
const EMPTY: Members = { men: 0, women: 0, teenBoys: 0, teenGirls: 0, kids: 0, littleKids: 0 };

// First sign-in: three quick questions so the crew plans for this household, not a default one.
export default function WelcomePage() {
  const router = useRouter();
  const onboard = useMutation(api.household.onboard);
  const setBudget = useMutation(api.weeks.setBudget);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [members, setMembers] = useState<Members>(EMPTY);
  const [leftovers, setLeftovers] = useState(false);
  const [level, setLevel] = useState<PlanLevel | "custom">("low");
  const [custom, setCustom] = useState("");
  const [snap, setSnap] = useState(false);
  const [snapText, setSnapText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const people = Object.values(members).reduce((a, b) => a + b, 0);
  const bump = (k: keyof Members, d: number) => setMembers((m) => ({ ...m, [k]: Math.min(12, Math.max(0, m[k] + d)) }));
  const budget = level === "custom" ? Number(custom) : suggestedBudget(level, members);

  async function finish(e: FormEvent) {
    e.preventDefault();
    if (!Number.isFinite(budget) || budget <= 0 || budget > 10_000) return setError("Type a weekly budget like 180.");
    const snapMonthly = snap ? Number((snapText || String(maxAllotment(peopleIn(members)))).replace("$", "")) : undefined;
    if (snapMonthly !== undefined && (!Number.isFinite(snapMonthly) || snapMonthly <= 0 || snapMonthly > 5000)) return setError("Type your monthly SNAP benefit, like 600.");
    setBusy(true);
    setError(null);
    try {
      await onboard({ name, members, leftovers, snapMonthly: snapMonthly === undefined ? undefined : Math.round(snapMonthly) });
      await setBudget({ budget, planLevel: level });
      router.replace("/plan");
    } catch {
      setError("Couldn't save that. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 py-4">
      <p className="font-sign text-sm text-tomato" aria-live="polite">Step {step + 1} of 3</p>

      {step === 0 && (
        <form onSubmit={(e) => { e.preventDefault(); setStep(1); }} className="flex flex-col gap-4">
          <h1 className="sign">Welcome to Mise</h1>
          <p className="font-bold text-ink-soft">Three quick questions so the kitchen crew plans dinners, prices, and a budget for your household.</p>
          <label className="flex flex-col gap-2 font-black">
            What should the crew call you?
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="given-name" placeholder="First name" className="field px-3 py-3 text-lg" />
          </label>
          <button type="submit" className="btn-press self-start">Next</button>
        </form>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <h1 className="sign">Who&apos;s eating at home?</h1>
          <ul className="flex flex-col gap-2">
            {GROUPS.map((g) => (
              <li key={g.key} className="crate flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="font-black">
                  {g.label} <span className="text-sm font-bold text-ink-soft">{g.note}</span>
                </span>
                <span className="flex items-center gap-2">
                  <button type="button" onClick={() => bump(g.key, -1)} disabled={members[g.key] === 0} className="btn-round h-10 w-10" aria-label={`One fewer: ${g.label}`}>
                    <Minus size={16} strokeWidth={3} aria-hidden />
                  </button>
                  <span className="font-sign w-6 text-center text-xl" aria-live="polite">{members[g.key]}</span>
                  <button type="button" onClick={() => bump(g.key, 1)} className="btn-round h-10 w-10" aria-label={`One more: ${g.label}`}>
                    <Plus size={16} strokeWidth={3} aria-hidden />
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <label className="flex items-center gap-3 font-bold">
            <input type="checkbox" checked={leftovers} onChange={(e) => setLeftovers(e.target.checked)} className="h-5 w-5 accent-[var(--color-kale)]" />
            Plan leftovers for the next day&apos;s lunch
          </label>
          {people > 0 && (
            <p className="text-sm font-extrabold text-kale-ink">
              Dinners will make {formatServings(servingsFor(members) + (leftovers ? 1.5 : 0))} servings (teens count as an adult and a half).
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(0)} className="btn-crate">Back</button>
            <button type="button" onClick={() => setStep(2)} disabled={people === 0} className="btn-press">Next</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={finish} className="flex flex-col gap-4">
          <h1 className="sign">Your weekly budget</h1>
          <p className="font-bold text-ink-soft">USDA&apos;s food-cost figures for your household (September 2026), adjusted for its size. Pick one or type your own.</p>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Weekly budget">
            {LEVELS.map(({ level: l, blurb }) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={level === l}
                onClick={() => setLevel(l)}
                className={`crate flex items-center justify-between gap-3 px-4 py-3 text-left ${level === l ? "border-ink bg-tag/30" : ""}`}
              >
                <span>
                  <span className="block font-black">{PLAN_LABELS[l]}</span>
                  <span className="text-sm font-bold text-ink-soft">{blurb}</span>
                </span>
                <span className="tag shrink-0 text-lg">{formatMoney(suggestedBudget(l, members))}</span>
              </button>
            ))}
            <label className={`crate flex items-center justify-between gap-3 px-4 py-3 ${level === "custom" ? "border-ink bg-tag/30" : ""}`}>
              <span className="font-black">My own</span>
              <input
                inputMode="decimal"
                value={custom}
                onFocus={() => setLevel("custom")}
                onChange={(e) => { setCustom(e.target.value); setLevel("custom"); }}
                placeholder="$ a week"
                aria-label="My own weekly budget"
                className="field w-28 px-2 py-1.5 text-right text-base"
              />
            </label>
          </div>
          <label className="flex items-center gap-3 font-bold">
            <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} className="h-5 w-5 accent-[var(--color-kale)]" />
            We use SNAP (EBT)
          </label>
          {snap && (
            <label className="crate flex items-center justify-between gap-3 px-4 py-3 text-sm font-bold">
              <span>
                Monthly SNAP benefit
                <span className="block font-normal text-ink-soft">
                  USDA&apos;s most for {peopleIn(members)} {peopleIn(members) === 1 ? "person" : "people"} is ${maxAllotment(peopleIn(members))}; yours may be less. About ${weeklyShare(Number(snapText) || maxAllotment(peopleIn(members)))} a week.
                </span>
              </span>
              <input inputMode="decimal" value={snapText} onChange={(e) => setSnapText(e.target.value)} placeholder={String(maxAllotment(peopleIn(members)))} aria-label="Monthly SNAP benefit" className="field w-28 px-2 py-1.5 text-right text-base" />
            </label>
          )}
          {error && <p className="font-bold text-tomato-dark" role="alert">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(1)} className="btn-crate">Back</button>
            <button type="submit" disabled={busy} className="btn-press">{busy ? "Starting…" : "Start my week"}</button>
          </div>
          <p className="text-xs font-bold text-ink-soft">You can change any of this later on the Budget page. Next, the crew will help you plan dinners.</p>
        </form>
      )}
    </div>
  );
}
