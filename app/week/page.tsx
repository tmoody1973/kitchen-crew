"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { ArrowRight, GripVertical, Lightbulb, MoreHorizontal, Plus, ShoppingBasket, Users, UtensilsCrossed } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { formatMoney, isWeekActive } from "@/lib/tally";
import { formatServings } from "@/lib/household";
import { DAY_MS, todayIndex, WEEK_MS } from "@/lib/weeks";

type Meal = Doc<"meals">;
type Target = { offset: number; dayIndex: number | null }; // dayIndex null = Ideas
type Col = { key: string; target: Target; weekday: string; date: string; today: boolean; past: boolean; meals: Meal[] };

const IDEAS = "ideas";
const colKey = (offset: number, day: number) => `w${offset}-d${day}`;
function parseKey(id: string): Target {
  if (id === IDEAS) return { offset: 0, dayIndex: null };
  const [, w, d] = id.match(/^w(\d)-d(\d)$/) ?? [];
  return { offset: Number(w), dayIndex: Number(d) };
}
const weekday = (t: number) => new Date(t).toLocaleDateString("en-US", { weekday: "long" });
const monthDay = (t: number) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });

// The week board. Phone: one day per screen, swipe between days, a day strip to jump. Desktop: all days side by side.
export default function WeekPage() {
  const week = useQuery(api.weeks.latest);
  const next = useQuery(api.weeks.byOffset, { offset: 1 });
  const thisMeals = useQuery(api.plans.meals, { offset: 0 });
  const nextMeals = useQuery(api.plans.meals, { offset: 1 });
  const recipes = useQuery(api.recipes.mine);
  const listItems = useQuery(api.listItems.mine, {});
  const moveMeal = useMutation(api.plans.moveMeal);
  const [span, setSpan] = useState<1 | 2>(1);
  const [active, setActive] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const didInitialScroll = useRef(false);

  useEffect(() => {
    if (localStorage.getItem("boardSpan") === "2") setSpan(2);
  }, []);

  // Desktop drag only; on phones the "···" menu moves dinners (dragging fights with swiping).
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const ready = week !== undefined && next !== undefined && thisMeals !== undefined && nextMeals !== undefined && recipes !== undefined;
  const now = Date.now();
  const columns: Col[] = [];
  if (ready && week && isWeekActive(week.startDate, now)) {
    const ideas = [...thisMeals, ...nextMeals].filter((m) => m.dayIndex === undefined);
    columns.push({ key: IDEAS, target: { offset: 0, dayIndex: null }, weekday: "Ideas", date: "not scheduled", today: false, past: false, meals: ideas });
    const weeks = [
      { offset: 0, start: week.startDate, meals: thisMeals },
      ...(span === 2 ? [{ offset: 1, start: next?.startDate ?? week.startDate + WEEK_MS, meals: nextMeals }] : []),
    ];
    for (const w of weeks) {
      for (let d = 0; d < 7; d++) {
        const t = w.start + d * DAY_MS;
        const ti = w.offset === 0 ? todayIndex(w.start, now) : -1;
        columns.push({
          key: colKey(w.offset, d),
          target: { offset: w.offset, dayIndex: d },
          weekday: weekday(t),
          date: monthDay(t),
          today: ti === d,
          past: w.offset === 0 && ti > d,
          meals: w.meals.filter((m) => m.dayIndex === d),
        });
      }
    }
  }

  // Track which day is centered (phone) so the strip highlights it.
  useEffect(() => {
    const el = scroller.current;
    if (!el || columns.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (hit) setActive((hit.target as HTMLElement).dataset.col ?? "");
      },
      { root: el, threshold: [0.6] },
    );
    el.querySelectorAll<HTMLElement>("[data-col]").forEach((c) => io.observe(c));
    return () => io.disconnect();
  });

  // Open on today.
  useEffect(() => {
    if (didInitialScroll.current || columns.length === 0) return;
    const today = columns.find((c) => c.today) ?? columns[1];
    scrollToCol(today.key, "instant");
    didInitialScroll.current = true;
  });

  function scrollToCol(key: string, behavior: ScrollBehavior = "smooth") {
    // Scroll only the board: scrollIntoView would also pan the page, which makes mobile Chrome widen it.
    const box = scroller.current;
    const col = box?.querySelector<HTMLElement>(`[data-col="${key}"]`);
    if (!box || !col) return;
    const offset = col.getBoundingClientRect().left - box.getBoundingClientRect().left;
    box.scrollTo({ left: box.scrollLeft + offset - (box.clientWidth - col.offsetWidth) / 2, behavior });
  }

  if (!ready) return null;
  if (!week || !isWeekActive(week.startDate, now)) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="sign">Your week</h1>
        <Link href="/budget" className="board block p-4 font-bold text-chalk">
          Set this week&apos;s budget to start your board.
        </Link>
      </div>
    );
  }

  const imageFor = new Map(recipes.map((r) => [r._id as string, r.imageUrl]));
  // Dinners from before the board aren't linked to a recipe; match them by name so they still get a photo.
  const imageByTitle = new Map(recipes.map((r) => [r.title.trim().toLowerCase(), r.imageUrl]));
  // How many scheduled dinners share this dinner's plan (same week), for "Remove this whole plan".
  const planSize = (m: Meal) =>
    m.planId ? [...(thisMeals ?? []), ...(nextMeals ?? [])].filter((x) => x.weekId === m.weekId && x.planId === m.planId && x.dayIndex !== undefined).length : 1;
  const photo = (m: Meal) => (m.recipeId ? imageFor.get(m.recipeId) : undefined) ?? imageByTitle.get(m.name.trim().toLowerCase());
  const targets = columns.map((c) => ({
    label: c.key === IDEAS ? "Ideas" : `${c.target.offset === 1 ? "Next " : ""}${c.weekday.slice(0, 3)} ${c.date}`,
    target: c.target,
  }));
  const plannedThisWeek = thisMeals.filter((m) => m.dayIndex !== undefined).reduce((s, m) => s + m.estimatedCost, 0);
  // Unpaid rows on this week's list, once there are dinners on the board.
  const toBuy = thisMeals.some((m) => m.dayIndex !== undefined) ? (listItems ?? []).filter((i) => i.paid === undefined).length : 0;
  const dinnersBudget = week.budget - (week.extrasBudget ?? 0);

  async function move(id: Id<"meals">, to: Target) {
    setError(null);
    await moveMeal({ id, offset: to.offset, dayIndex: to.dayIndex }).catch(() => setError("Couldn't move that dinner. Try again."));
  }
  const onDragEnd = (e: DragEndEvent) => {
    if (e.over) move(e.active.id as Id<"meals">, parseKey(String(e.over.id)));
  };

  return (
    <div className="flex flex-col gap-3">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="sign">Your week</h1>
          <p className="text-sm font-bold text-ink-soft">
            Dinners <span className="tag mx-1 text-xs">~{formatMoney(Math.round(plannedThisWeek * 100) / 100)}</span> of {formatMoney(dinnersBudget)}
          </p>
        </div>
        <div className="flex shrink-0 rounded-full border-2 border-ink bg-white p-0.5 text-xs font-black" role="radiogroup" aria-label="Weeks shown">
          {([1, 2] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={span === s}
              onClick={() => {
                setSpan(s);
                localStorage.setItem("boardSpan", String(s));
              }}
              className={`rounded-full px-2.5 py-1 ${span === s ? "bg-ink text-chalk" : "text-ink-soft"}`}
            >
              {s === 1 ? "1 wk" : "2 wks"}
            </button>
          ))}
        </div>
      </header>

      {/* The next step once dinners are on the board: go shop the list they built. */}
      {toBuy > 0 && (
        <Link href="/list" className="crate flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 font-extrabold hover:bg-line/40">
          <span className="flex items-center gap-2">
            <ShoppingBasket size={18} strokeWidth={2.75} aria-hidden />
            Your shopping list is ready: {toBuy} {toBuy === 1 ? "item" : "items"} to buy
          </span>
          <span className="flex items-center gap-1 text-tomato-dark">
            Go shopping <ArrowRight size={16} strokeWidth={3} aria-hidden />
          </span>
        </Link>
      )}

      {/* Day strip: jump to a day; today is ringed, a dot means a dinner is planned. */}
      <nav aria-label="Days" className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
        {columns.map((c) => {
          const on = active === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => scrollToCol(c.key)}
              aria-current={on ? "true" : undefined}
              className={`relative flex w-12 shrink-0 flex-col items-center rounded-2xl border-2 py-1.5 ${
                on ? "border-ink bg-ink text-chalk" : c.today ? "border-tomato bg-white" : "border-line bg-white"
              } ${c.past && !on ? "opacity-55" : ""}`}
            >
              {c.key === IDEAS ? (
                <Lightbulb size={16} strokeWidth={2.75} aria-hidden className="my-0.5" />
              ) : (
                <>
                  <span className="text-xs font-extrabold uppercase">{c.weekday.slice(0, 3)}</span>
                  <span className="font-sign text-base leading-none">{c.date.split(" ")[1]}</span>
                </>
              )}
              <span aria-hidden className={`mt-1 h-1.5 w-1.5 rounded-full ${c.meals.length ? (on ? "bg-tag" : "bg-tomato") : "bg-transparent"}`} />
              <span className="sr-only">
                {c.key === IDEAS ? "Ideas" : `${c.weekday} ${c.date}`}, {c.meals.length} dinners
              </span>
            </button>
          );
        })}
      </nav>
      {error && (
        <p className="font-bold text-tomato-dark" role="alert">
          {error}
        </p>
      )}

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        {/* Full-bleed via negative margins (no page overflow). Phone: one column per screen, neighbors peeking. Desktop: the whole board. */}
        <div
          ref={scroller}
          className="mx-[calc(50%-50vw)] snap-x snap-mandatory overflow-x-auto scroll-smooth px-7 pb-6 [scrollbar-width:none] lg:px-6"
        >
          <div className="mx-auto flex w-max gap-3">
            {columns.map((c) => (
              <Column key={c.key} col={c}>
                {c.meals.map((m) => (
                  <MealCard key={m._id} meal={m} image={photo(m)} targets={targets} onMove={move} planSize={planSize(m)} />
                ))}
              </Column>
            ))}
          </div>
        </div>
      </DndContext>
    </div>
  );
}

function Column({ col, children }: { col: Col; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  const ideas = col.key === IDEAS;
  return (
    <section
      ref={setNodeRef}
      data-col={col.key}
      aria-label={ideas ? "Ideas" : `${col.weekday} ${col.date}`}
      className={`flex w-[calc(100vw-3.5rem)] max-w-sm shrink-0 snap-center flex-col gap-3 rounded-3xl p-3 lg:w-72 ${
        isOver ? "bg-tag/30 ring-2 ring-ink" : ideas ? "border-2 border-dashed border-ink-soft/50 bg-ground" : "bg-[#f1ece1]"
      } ${col.past ? "opacity-60" : ""}`}
    >
      <header className="flex flex-wrap items-baseline gap-x-2 px-1">
        <h2 className={`sign text-2xl ${col.today ? "text-tomato" : ""}`}>{ideas ? "Ideas" : col.weekday}</h2>
        <span className="text-sm font-bold text-ink-soft">{col.date}</span>
        {col.today && <span className="rounded-full bg-tomato px-2 py-0.5 text-xs font-black text-white">today</span>}
        <span className="ml-auto flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-xs font-black">{col.meals.length}</span>
      </header>
      <div className="flex min-h-40 flex-col gap-3">{children}</div>
      {!ideas && !col.past && (
        <Link
          href="/plan"
          className="flex items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-ink-soft/40 py-3 text-sm font-extrabold text-ink-soft hover:border-ink hover:text-ink"
        >
          <Plus size={16} strokeWidth={3} aria-hidden /> Plan a dinner
        </Link>
      )}
    </section>
  );
}

function MealCard({
  meal,
  image,
  targets,
  onMove,
  planSize = 1,
}: {
  meal: Meal;
  image?: string;
  targets: { label: string; target: Target }[];
  onMove: (id: Id<"meals">, to: Target) => void;
  planSize?: number; // scheduled dinners from the same "Use this plan"
}) {
  const remove = useMutation(api.plans.removeMeal);
  const removePlan = useMutation(api.plans.removePlan);
  const [menu, setMenu] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: meal._id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`relative flex gap-3 rounded-2xl bg-white p-3 shadow-[0_2px_6px_-2px_rgb(29_36_31/0.18)] lg:flex-col ${isDragging ? "z-20 shadow-lg" : ""}`}
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#f1ece1] lg:h-28 lg:w-full">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- recipe photo from its source site
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-ink-soft">
            <UtensilsCrossed size={26} strokeWidth={2} aria-hidden />
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-1">
          <p className="line-clamp-2 min-w-0 flex-1 font-black leading-snug">
            {meal.recipeId ? (
              <Link href={`/recipes/${meal.recipeId}`} className="hover:underline">
                {meal.name}
              </Link>
            ) : (
              meal.name
            )}
          </p>
          <button
            type="button"
            className="hidden cursor-grab touch-none rounded p-0.5 text-ink-soft active:cursor-grabbing lg:block"
            aria-label={`Drag ${meal.name}`}
            {...listeners}
            {...attributes}
          >
            <GripVertical size={16} strokeWidth={2.5} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setMenu(!menu)}
            aria-expanded={menu}
            aria-label={`Options for ${meal.name}`}
            className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-line"
          >
            <MoreHorizontal size={18} strokeWidth={2.75} aria-hidden />
          </button>
        </div>
        <div className="mt-auto flex items-center gap-2 pt-2">
          {meal.servings && (
            <span className="flex items-center gap-1 text-xs font-bold text-ink-soft">
              <Users size={13} strokeWidth={2.5} aria-hidden /> serves {formatServings(meal.servings)}
            </span>
          )}
          <span className="tag ml-auto text-sm">~{formatMoney(meal.estimatedCost)}</span>
        </div>
      </div>

      {menu &&
        // Portal: keeps the sheet out of the swiping columns, so nothing clips it.
        createPortal(
        <>
          <button type="button" aria-label="Close menu" className="fixed inset-0 z-30 cursor-default bg-ink/30" onClick={() => setMenu(false)} />
          {/* Phone: a bottom sheet. Desktop: a centered panel. */}
          <div
            role="menu"
            className="fixed inset-x-0 bottom-0 z-40 max-h-[70vh] overflow-y-auto rounded-t-3xl border-t-2 border-ink bg-white p-3 pb-6 shadow-lg lg:inset-x-auto lg:bottom-auto lg:left-1/2 lg:top-1/3 lg:max-h-96 lg:w-72 lg:-translate-x-1/2 lg:rounded-2xl lg:border-2 lg:p-2"
          >
            <div aria-hidden className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-line lg:hidden" />
            <p className="px-2 pb-1 font-black lg:pt-0.5 lg:text-xs lg:uppercase lg:text-ink-soft">
              <span className="lg:hidden">Move &ldquo;{meal.name}&rdquo; to</span>
              <span className="hidden lg:inline">Move to</span>
            </p>
            {targets.map((t) => (
              <button
                key={t.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenu(false);
                  onMove(meal._id, t.target);
                }}
                className="block w-full rounded-xl px-3 py-3 text-left font-bold hover:bg-tag/40 lg:rounded-lg lg:px-2 lg:py-1.5 lg:text-sm"
              >
                {t.label}
              </button>
            ))}
            <div className="my-1 border-t-2 border-dashed border-line" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenu(false);
                remove({ id: meal._id });
              }}
              className="block w-full rounded-xl px-3 py-3 text-left font-bold text-tomato-dark hover:bg-line lg:rounded-lg lg:px-2 lg:py-1.5 lg:text-sm"
            >
              Remove from the week
            </button>
            {meal.planId && planSize > 1 && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenu(false);
                  if (window.confirm(`Remove all ${planSize} dinners from this plan? Items you already paid for stay on the list.`)) {
                    removePlan({ weekId: meal.weekId, planId: meal.planId! });
                  }
                }}
                className="block w-full rounded-xl px-3 py-3 text-left font-bold text-tomato-dark hover:bg-line lg:rounded-lg lg:px-2 lg:py-1.5 lg:text-sm"
              >
                Remove this whole plan ({planSize} dinners)
              </button>
            )}
          </div>
        </>,
          document.body,
        )}
    </article>
  );
}
