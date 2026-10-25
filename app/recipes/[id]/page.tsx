"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { scaleIngredients } from "@/lib/recipes/scale";
import { formatAmount, type UnitSystem } from "@/lib/recipes/units";
import { formatServings, targetServings } from "@/lib/household";

const BADGE = { web: "🌐 Website", youtube: "▶ YouTube", crew: "🧑‍🍳 Kitchen Crew" } as const;

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
      <p className="rounded-2xl bg-white p-4 font-bold text-slate-500">
        That recipe isn&apos;t in your collection. <Link href="/recipes" className="text-leaf-dark underline">My Recipes →</Link>
      </p>
    );
  }

  const cookFor = servings ?? targetServings(household);
  const ingredients = scaleIngredients(recipe.ingredients, recipe.servings, cookFor);

  return (
    <article className="flex flex-col gap-4 pb-8">
      <div className="relative overflow-hidden rounded-2xl bg-slate-200">
        {recipe.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- recipe photo from the source site
          <img src={recipe.imageUrl} alt="" className="h-56 w-full object-cover" />
        )}
        <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-black text-white ${recipe.sourceType === "youtube" ? "bg-red-600" : "bg-leaf-dark"}`}>
          {BADGE[recipe.sourceType]}
        </span>
      </div>

      <div>
        <h1 className="text-3xl font-black">{recipe.title}</h1>
        {recipe.sourceName && <p className="font-bold text-slate-500">from {recipe.sourceName}</p>}
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-4 text-center font-bold">
        <div>
          <p className="text-xs uppercase text-slate-500">Time</p>
          <p className="text-lg font-black">{recipe.totalMinutes ? `${recipe.totalMinutes} min` : "—"}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-500">Original</p>
          <p className="text-lg font-black">serves {formatServings(recipe.servings)}</p>
        </div>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-black">Ingredients</h2>
          <div className="flex rounded-full border-2 border-slate-200 p-0.5 text-sm font-black" role="radiogroup" aria-label="Units">
            {(["us", "metric"] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={system === s}
                onClick={() => chooseSystem(s)}
                className={`rounded-full px-3 py-1 ${system === s ? "bg-leaf text-white" : "text-slate-500"}`}
              >
                {s === "us" ? "US" : "Metric"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 font-black" aria-label={`Cooking for ${formatServings(cookFor)} servings`}>
            <button type="button" onClick={() => setServings(Math.max(1, cookFor - 0.5))} className="h-9 w-9 rounded-full border-2 border-slate-200" aria-label="Fewer servings">−</button>
            <span className="w-16 text-center">👥 {formatServings(cookFor)}</span>
            <button type="button" onClick={() => setServings(Math.min(12, cookFor + 0.5))} className="h-9 w-9 rounded-full border-2 border-slate-200" aria-label="More servings">+</button>
          </div>
        </div>
        <ul className="flex flex-col gap-2">
          {ingredients.map((i, n) => (
            <li key={n} className="flex gap-3">
              <span className="w-32 shrink-0 text-right font-bold text-carrot-dark">{formatAmount(i.amount, i.unit, i.name, system)}</span>
              <span className="font-bold">
                {i.name}
                {i.fixed && <span className="ml-2 text-xs font-bold text-slate-500">🔒 doesn&apos;t scale</span>}
                {i.madeInRecipe && <span className="ml-2 text-xs font-bold text-slate-500">made in an earlier step · not bought</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {recipe.steps.length > 0 && (
        <section className="flex flex-col gap-3 rounded-2xl bg-white p-4">
          <h2 className="text-xl font-black">Steps</h2>
          <ol className="flex flex-col gap-3">
            {recipe.steps.map((s, n) => (
              <li key={n} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-leaf text-sm font-black text-white">{n + 1}</span>
                <p className="font-bold text-slate-700">{s}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {recipe.sourceUrl && (
        <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-center font-black text-leaf-dark underline">
          {recipe.sourceType === "youtube" ? "Watch the video →" : "Original recipe →"}
        </a>
      )}
    </article>
  );
}
