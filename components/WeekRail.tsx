"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ArrowRight } from "lucide-react";
import { dayLabel } from "@/lib/weeks";

// Laptop planner rail: this week's scheduled dinners, so the crew's suggestions are planned with the board in view.
export default function WeekRail() {
  const week = useQuery(api.weeks.latest);
  const meals = useQuery(api.plans.meals, {});
  if (!week || !meals) return null;
  const scheduled = meals.filter((m) => m.dayIndex !== undefined).sort((a, b) => a.dayIndex! - b.dayIndex!);
  return (
    <section className="crate hidden flex-col gap-2 p-4 lg:flex" aria-label="This week's dinners">
      <h2 className="font-sign text-lg">This week</h2>
      {scheduled.length === 0 ? (
        <p className="text-sm font-bold text-ink-soft">No dinners on the board yet. Ask the crew for a plan.</p>
      ) : (
        <ul className="flex flex-col">
          {scheduled.map((m) => (
            <li key={m._id} className="row-rule py-2">
              <p className="font-sign text-xs text-tomato">{dayLabel(week.startDate, m.dayIndex!)}</p>
              {m.recipeId ? (
                <Link href={`/recipes/${m.recipeId}`} className="font-black leading-snug hover:underline">{m.name}</Link>
              ) : (
                <p className="font-black leading-snug">{m.name}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      <Link href="/week" className="flex items-center gap-1 self-start text-sm font-extrabold underline">
        Open the board <ArrowRight size={14} strokeWidth={3} aria-hidden />
      </Link>
    </section>
  );
}
