"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ArrowUpRight, ChefHat, Globe, Lock, Minus, PlayCircle, Plus, Users } from "lucide-react";
import { scaleIngredients } from "@/lib/recipes/scale";
import { formatAmount, type UnitSystem } from "@/lib/recipes/units";
import { formatServings, targetServings } from "@/lib/household";

const BADGE = { web: { label: "Website", Icon: Globe }, youtube: { label: "YouTube", Icon: PlayCircle }, crew: { label: "Mise crew", Icon: ChefHat } } as const;

// One recipe: photo, source, stats, ingredients scaled to your servings, and steps. Layout borrowed from Digero.
export default function RecipePage() {
  const { id } = useParams<{ id: string }>();
  const recipe = useQuery(api.recipes.get, { id });
  const household = useQuery(api.household.mine);
  const [servings, setServings] = useState<number | null>(null);
  // US or metric, remembered on this device.
  const [system, setSystem] = useState<UnitSystem>("us");
  useEffect(() => {
    if (localStorage.getItem("units") === "metric") setSystem("metric");
  }, []);
  function chooseSystem(next: UnitSystem) {
    setSystem(next);
    localStorage.setItem("units", next);
  }

  if (recipe === undefined || household === undefined) return null;
  if (recipe === null) {
    return (
      <p className="crate p-4 font-bold text-ink-soft">
        That recipe isn&apos;t in your collection. <Link href="/recipes" className="font-extrabold text-ink underline">My Recipes</Link>
      </p>
    );
  }

  const cookFor = servings ?? targetServings(household);
  const ingredients = scaleIngredients(recipe.ingredients, recipe.servings, cookFor);

  return (
    <article className="flex flex-col gap-4 pb-8">
      <div className="relative overflow-hidden rounded-2xl bg-line">
        {recipe.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- recipe photo from the source site
          <img src={recipe.imageUrl} alt="" className="h-56 w-full object-cover" />
        )}
        <span className="tag absolute left-3 top-3 flex items-center gap-1 text-xs">
          {(() => {
            const { Icon, label } = BADGE[recipe.sourceType];
            return (
              <>
                <Icon size={13} strokeWidth={2.5} aria-hidden /> {label}
              </>
            );
          })()}
        </span>
      </div>

      <div>
        <h1 className="font-sign text-3xl leading-tight">{recipe.title}</h1>
        {recipe.sourceName && <p className="font-bold text-ink-soft">from {recipe.sourceName}</p>}
      </div>

      <div className="grid grid-cols-2 gap-2 crate p-4 text-center font-bold">
        <div>
          <p className="text-xs uppercase text-ink-soft">Time</p>
          <p className="text-lg font-black">{recipe.totalMinutes ? `${recipe.totalMinutes} min` : "—"}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-ink-soft">Original</p>
          <p className="text-lg font-black">serves {formatServings(recipe.servings)}</p>
        </div>
      </div>

      <section className="flex flex-col gap-3 crate p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-sign text-xl">Ingredients</h2>
          <div className="flex rounded-full border-2 border-ink p-0.5 text-sm font-black" role="radiogroup" aria-label="Units">
            {(["us", "metric"] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={system === s}
                onClick={() => chooseSystem(s)}
                className={`rounded-full px-3 py-1 ${system === s ? "bg-ink text-chalk" : "text-ink-soft"}`}
              >
                {s === "us" ? "US" : "Metric"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 font-black" aria-label={`Cooking for ${formatServings(cookFor)} servings`}>
            <button type="button" onClick={() => setServings(Math.max(1, cookFor - 0.5))} className="btn-round h-9 w-9" aria-label="Fewer servings"><Minus size={15} strokeWidth={3} aria-hidden /></button>
            <span className="flex w-14 items-center justify-center gap-1"><Users size={15} strokeWidth={2.75} aria-hidden /> {formatServings(cookFor)}</span>
            <button type="button" onClick={() => setServings(Math.min(12, cookFor + 0.5))} className="btn-round h-9 w-9" aria-label="More servings"><Plus size={15} strokeWidth={3} aria-hidden /></button>
          </div>
        </div>
        <ul className="flex flex-col gap-2">
          {ingredients.map((i, n) => (
            <li key={n} className="flex gap-3">
              <span className="w-32 shrink-0 text-right font-extrabold text-crate">{formatAmount(i.amount, i.unit, i.name, system)}</span>
              <span className="font-bold">
                {i.name}
                {i.fixed && <span className="ml-2 inline-flex items-center gap-0.5 text-xs font-bold text-ink-soft"><Lock size={11} strokeWidth={3} aria-hidden /> doesn&apos;t scale</span>}
                {i.madeInRecipe && <span className="ml-2 text-xs font-bold text-ink-soft">made in an earlier step · not bought</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {recipe.steps.length > 0 && (
        <section className="flex flex-col gap-3 crate p-4">
          <h2 className="font-sign text-xl">Steps</h2>
          <ol className="flex flex-col gap-3">
            {recipe.steps.map((s, n) => (
              <li key={n} className="flex gap-3">
                <span className="font-sign flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate text-sm text-chalk">{n + 1}</span>
                <p className="font-bold text-ink">{s}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {recipe.sourceUrl && (
        <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="btn-crate self-center">
          {recipe.sourceType === "youtube" ? "Watch the video" : "Original recipe"} <ArrowUpRight size={16} strokeWidth={3} aria-hidden />
        </a>
      )}
    </article>
  );
}
