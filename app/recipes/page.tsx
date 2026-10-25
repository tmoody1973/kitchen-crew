"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ArrowRight, ChefHat, Globe, PlayCircle, X } from "lucide-react";
import { formatServings } from "@/lib/household";
import { dayLabel } from "@/lib/weeks";

const ICON = { web: Globe, youtube: PlayCircle, crew: ChefHat } as const;

function SourceBadge({ type }: { type: keyof typeof ICON }) {
  const Icon = ICON[type];
  return (
    <span className="absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-chalk">
      <Icon size={12} strokeWidth={2.75} aria-hidden />
    </span>
  );
}

// This week's dinners up top, then everything you've saved. Layout borrowed from Digero's recipe list.
export default function RecipesPage() {
  const recipes = useQuery(api.recipes.mine);
  const week = useQuery(api.weeks.latest);
  const allMeals = useQuery(api.plans.meals, {});
  // This week's scheduled dinners, in day order (Ideas live on the Week board).
  const meals = allMeals?.filter((m) => m.dayIndex !== undefined).sort((a, b) => a.dayIndex! - b.dayIndex!);
  const remove = useMutation(api.recipes.remove);
  if (recipes === undefined || meals === undefined) return null;

  return (
    <div className="flex flex-col gap-4">
      {meals.length > 0 && (
        <section className="flex flex-col gap-1">
          <h2 className="sign text-2xl">This week&apos;s dinners</h2>
          <div className="border-y-2 border-dashed border-line">
          {meals.map((m) => (
            <div key={m._id} className="row-rule flex items-center justify-between gap-3 py-3">
              <div>
                <p className="font-sign text-xs text-tomato">{week ? dayLabel(week.startDate, m.dayIndex!) : m.day}</p>
                <p className="font-black">{m.name}</p>
              </div>
              {m.recipeId && (
                <Link href={`/recipes/${m.recipeId}`} className="flex shrink-0 items-center gap-1 font-extrabold underline">
                  Recipe <ArrowRight size={14} strokeWidth={3} aria-hidden />
                </Link>
              )}
            </div>
          ))}
          </div>
        </section>
      )}

      <header className="ruled">
        <h1 className="sign">My Recipes</h1>
        <p className="font-bold text-ink-soft">
          {recipes.length} saved. Paste a recipe link in <Link href="/plan" className="font-extrabold text-ink underline">the planner</Link> to add one,
          or ask the crew to plan from your saved recipes.
        </p>
      </header>

      {recipes.length > 0 && <ul className="crate px-3">
        {recipes.map((r) => (
          <li key={r._id} className="row-rule flex items-center gap-3 py-3">
            <Link href={`/recipes/${r._id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-line">
                {r.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- recipe photo from the source site
                  <img src={r.imageUrl} alt="" className="h-full w-full object-cover" />
                )}
                <SourceBadge type={r.sourceType} />
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 font-black leading-snug">{r.title}</p>
                <p className="text-sm font-bold text-ink-soft">
                  {r.totalMinutes ? `${r.totalMinutes} min · ` : ""}serves {formatServings(r.servings)}
                  {r.sourceName ? ` · ${r.sourceName}` : ""}
                </p>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => remove({ id: r._id })}
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-line"
              aria-label={`Remove ${r.title}`}
            >
              <X size={16} strokeWidth={3} aria-hidden />
            </button>
          </li>
        ))}
      </ul>}
    </div>
  );
}
