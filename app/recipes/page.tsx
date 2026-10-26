"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ArrowRight, ChefHat, Globe, Link as LinkIcon, PlayCircle, RefreshCw, Search, X } from "lucide-react";
import { filterRecipes, topTags } from "@/lib/recipes/filter";
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

/** Paste a recipe website or YouTube link: the crew's reader saves it, then the recipe opens. */
function AddFromLink() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function add(e: FormEvent) {
    e.preventDefault();
    if (!url.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/recipes/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!data.id) throw new Error(data.error ?? "I couldn't read that recipe.");
      router.push(`/recipes/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "I couldn't read that recipe.");
      setBusy(false);
    }
  }
  return (
    <form onSubmit={add} className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <input
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a recipe or YouTube link"
          maxLength={2000}
          aria-label="Recipe link"
          disabled={busy}
          className="field min-w-0 flex-1 px-3 py-2.5 text-base"
        />
        <button type="submit" disabled={busy || !url.trim()} className="btn-press shrink-0">
          <LinkIcon size={18} strokeWidth={2.75} aria-hidden /> {busy ? "Reading…" : "Add"}
        </button>
      </div>
      {busy && <p className="text-sm font-bold text-ink-soft" role="status">The crew is reading the recipe. Videos can take up to a minute.</p>}
      {error && <p className="text-sm font-bold text-tomato-dark" role="alert">{error}</p>}
    </form>
  );
}

/** "Sync my playlist": new videos from the YouTube recipe playlist join the shelf, not read yet. */
function SyncPlaylist() {
  const [state, setState] = useState<{ busy: boolean; note?: string; error?: boolean }>({ busy: false });
  async function sync() {
    setState({ busy: true });
    try {
      const res = await fetch("/api/playlist", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { added?: number; total?: number; error?: string };
      if (!res.ok) return setState({ busy: false, error: true, note: data.error ?? "Sync didn't work. Try again?" });
      setState({
        busy: false,
        note: data.added
          ? `Added ${data.added} video${data.added === 1 ? "" : "s"}. Each recipe is read the first time you open it.`
          : `Up to date: all ${data.total} playlist videos are here.`,
      });
    } catch {
      setState({ busy: false, error: true, note: "No connection. Try again?" });
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={sync} disabled={state.busy} className="btn-crate">
        <RefreshCw size={16} strokeWidth={3} aria-hidden className={state.busy ? "animate-spin" : ""} />
        {state.busy ? "Syncing…" : "Sync my playlist"}
      </button>
      {state.note && (
        <p role="status" className={`text-sm font-bold ${state.error ? "text-tomato-dark" : "text-ink-soft"}`}>{state.note}</p>
      )}
    </div>
  );
}

/** Recipes never tagged (new playlist videos, pasted links, the crew's dinners) get tagged by Claude. Returns true while it works. */
function useAutoTag(untagged: number) {
  const [busy, setBusy] = useState(false);
  const lastTry = useRef(-1); // one try per batch size, so a failure doesn't loop
  useEffect(() => {
    if (untagged === 0 || busy || lastTry.current === untagged) return;
    lastTry.current = untagged;
    setBusy(true);
    fetch("/api/recipes/tag", { method: "POST" })
      .catch(() => {})
      .finally(() => setBusy(false));
  }, [untagged, busy]);
  return busy;
}

// This week's dinners up top, then everything you've saved. Layout borrowed from Digero's recipe list.
export default function RecipesPage() {
  const recipes = useQuery(api.recipes.mine);
  const week = useQuery(api.weeks.latest);
  const allMeals = useQuery(api.plans.meals, {});
  // This week's scheduled dinners, in day order (Ideas live on the Week board).
  const meals = allMeals?.filter((m) => m.dayIndex !== undefined).sort((a, b) => a.dayIndex! - b.dayIndex!);
  const remove = useMutation(api.recipes.remove);
  const [search, setSearch] = useState("");
  const [chips, setChips] = useState<string[]>([]);
  const tagging = useAutoTag(recipes?.filter((r) => r.tags === undefined).length ?? 0);
  if (recipes === undefined || meals === undefined) return null;
  const shown = filterRecipes(recipes, search, chips);
  // Chosen chips stay visible even if they drop out of the most-used list.
  const chipTags = [...new Set([...chips, ...topTags(recipes, 16)])];
  const toggle = (t: string) => setChips((c) => (c.includes(t) ? c.filter((x) => x !== t) : [...c, t]));

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start lg:gap-8">
      {/* Laptop: this week, sync, search, and tags stay pinned on the left; recipes fill a photo grid. */}
      <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pb-2">
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
          {recipes.length} saved. Add one from a link, or ask <Link href="/plan" className="font-extrabold text-ink underline">the crew</Link> to plan from your saved recipes.
        </p>
        <AddFromLink />
        <SyncPlaylist />
      </header>

      {recipes.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="relative">
            <span className="sr-only">Search My Recipes</span>
            <Search size={17} strokeWidth={2.75} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search recipes, ingredients, tags"
              className="field w-full pl-10"
            />
          </label>
          {chipTags.length > 0 && (
            <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0" role="group" aria-label="Filter by tag">
              {chipTags.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={chips.includes(t)}
                  onClick={() => toggle(t)}
                  className={`relative shrink-0 rounded-full border-2 px-3 py-1 text-sm font-extrabold ${
                    chips.includes(t) ? "border-ink bg-ink text-chalk" : "border-line bg-white text-ink"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          <p className="text-sm font-bold text-ink-soft" role="status">
            {search || chips.length ? `${shown.length} of ${recipes.length} recipes` : ""}
            {tagging ? `${search || chips.length ? " · " : ""}Tagging new recipes…` : ""}
          </p>
        </div>
      )}

      </aside>
      <section className="flex min-w-0 flex-col gap-4" aria-label="Saved recipes">
      {recipes.length > 0 && shown.length === 0 && (
        <div className="crate flex flex-col items-start gap-2 p-4">
          <p className="font-bold text-ink-soft">No recipes match.</p>
          <button type="button" onClick={() => { setSearch(""); setChips([]); }} className="btn-press">Clear search</button>
        </div>
      )}

      {shown.length > 0 && <ul className="crate px-3 lg:grid lg:grid-cols-3 lg:gap-4 lg:border-0 lg:bg-transparent lg:px-0 xl:grid-cols-4">
        {shown.map((r) => (
          <li key={r._id} className="row-rule flex items-center gap-3 py-3 lg:relative lg:flex-col lg:items-stretch lg:gap-0 lg:overflow-hidden lg:rounded-2xl lg:border-2 lg:border-solid lg:border-line lg:bg-white lg:py-0">
            <Link href={`/recipes/${r._id}`} className="flex min-w-0 flex-1 items-center gap-3 lg:flex-col lg:items-stretch lg:gap-0">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-line lg:aspect-video lg:h-auto lg:w-full lg:rounded-none">
                {r.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- recipe photo from the source site
                  <img src={r.imageUrl} alt="" className="h-full w-full object-cover" />
                )}
                <SourceBadge type={r.sourceType} />
              </div>
              <div className="min-w-0 lg:p-3">
                <p className="line-clamp-2 font-black leading-snug">{r.title}</p>
                <p className="text-sm font-bold text-ink-soft">
                  {r.unread ? (
                    <span className="tag mr-1 text-xs">not read yet</span>
                  ) : (
                    <>{r.totalMinutes ? `${r.totalMinutes} min · ` : ""}serves {formatServings(r.servings)}</>
                  )}
                  {r.sourceName ? `${r.unread ? "" : " · "}${r.sourceName}` : ""}
                </p>
                {r.tags && r.tags.length > 0 && <p className="truncate text-xs font-bold text-ink-soft">{r.tags.slice(0, 4).join(" · ")}</p>}
              </div>
            </Link>
            <button
              type="button"
              onClick={() => remove({ id: r._id })}
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-line lg:absolute lg:right-2 lg:top-2 lg:bg-white/90 lg:text-ink"
              aria-label={`Remove ${r.title}`}
            >
              <X size={16} strokeWidth={3} aria-hidden />
            </button>
          </li>
        ))}
      </ul>}
      </section>
    </div>
  );
}
