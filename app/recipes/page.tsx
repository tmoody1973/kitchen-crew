"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatServings } from "@/lib/household";

const ICON = { web: "🌐", youtube: "▶", crew: "🧑‍🍳" } as const;

// This week's dinners up top, then everything you've saved. Layout borrowed from Digero's recipe list.
export default function RecipesPage() {
  const recipes = useQuery(api.recipes.mine);
  const meals = useQuery(api.plans.meals);
  const remove = useMutation(api.recipes.remove);
  if (recipes === undefined || meals === undefined) return null;

  return (
    <div className="flex flex-col gap-4">
      {meals.length > 0 && (
        <section className="flex flex-col gap-2 rounded-2xl bg-white p-4">
          <h2 className="text-xl font-black">This week&apos;s dinners</h2>
          {meals.map((m) => (
            <div key={m._id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
              <div>
                <p className="text-xs font-black uppercase text-leaf-dark">{m.day}</p>
                <p className="font-black">{m.name}</p>
              </div>
              {m.recipeId && (
                <Link href={`/recipes/${m.recipeId}`} className="shrink-0 font-bold text-leaf-dark underline">
                  Recipe →
                </Link>
              )}
            </div>
          ))}
        </section>
      )}

      <div className="rounded-2xl bg-white p-4">
        <h1 className="text-2xl font-black">My Recipes</h1>
        <p className="font-bold text-slate-500">
          {recipes.length} saved. Paste a recipe link in <Link href="/plan" className="text-leaf-dark underline">the planner</Link> to add one,
          or ask the crew to plan from your saved recipes.
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {recipes.map((r) => (
          <li key={r._id} className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white p-3">
            <Link href={`/recipes/${r._id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                {r.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- recipe photo from the source site
                  <img src={r.imageUrl} alt="" className="h-full w-full object-cover" />
                )}
                <span className="absolute bottom-0.5 left-0.5 rounded bg-white/90 px-1 text-xs">{ICON[r.sourceType]}</span>
              </div>
              <div className="min-w-0">
                <p className="truncate font-black">{r.title}</p>
                <p className="text-sm font-bold text-slate-500">
                  {r.totalMinutes ? `${r.totalMinutes} min · ` : ""}serves {formatServings(r.servings)}
                  {r.sourceName ? ` · ${r.sourceName}` : ""}
                </p>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => remove({ id: r._id })}
              className="rounded-full px-3 py-2 text-slate-400 hover:bg-slate-100"
              aria-label={`Remove ${r.title}`}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
