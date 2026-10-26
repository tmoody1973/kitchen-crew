"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Globe, Plus, Search, TriangleAlert } from "lucide-react";

export type RecipeSearch =
  | { ok: true; query: string; hits: { title: string; url: string; site: string; snippet: string; saved: boolean }[] }
  | { ok: false; error: string };

type RowState = { busy?: boolean; id?: string; error?: string };

// Web results from the crew's recipe search; Add reads the page and saves it to My Recipes, right here in the chat.
export default function RecipeSearchCard({ data }: { data: RecipeSearch }) {
  const [rows, setRows] = useState<Record<string, RowState>>({});
  if (!data.ok) {
    return (
      <p className="crate flex items-center gap-2 border-tomato px-4 py-3 font-bold text-tomato-dark" role="alert">
        <TriangleAlert size={18} strokeWidth={2.5} aria-hidden /> {data.error}
      </p>
    );
  }

  async function add(url: string) {
    setRows((r) => ({ ...r, [url]: { busy: true } }));
    const res = await fetch("/api/recipes/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) }).catch(() => null);
    const out = (await res?.json().catch(() => ({}))) as { id?: string; error?: string } | undefined;
    setRows((r) => ({ ...r, [url]: out?.id ? { id: out.id } : { error: out?.error ?? "Couldn't read that page." } }));
  }

  return (
    <div className="crate flex w-full flex-col gap-3 p-4">
      <p className="flex items-center gap-2 text-lg font-black">
        <Search size={20} strokeWidth={2.75} aria-hidden /> Recipes for &ldquo;{data.query}&rdquo;
      </p>
      {data.hits.length === 0 && <p className="font-bold text-ink-soft">Nothing found. Try other words.</p>}
      <ul className="flex flex-col gap-3">
        {data.hits.map((h) => {
          const row = rows[h.url] ?? {};
          return (
            <li key={h.url} className="flex items-start gap-3 border-t-2 border-line pt-3 first:border-0 first:pt-0">
              <div className="min-w-0 flex-1">
                <a href={h.url} target="_blank" rel="noreferrer" className="font-black leading-snug underline-offset-2 hover:underline">
                  {h.title}
                </a>
                <p className="flex items-center gap-1 text-xs font-extrabold text-ink-soft">
                  <Globe size={12} strokeWidth={2.75} aria-hidden /> {h.site}
                </p>
                {h.snippet && <p className="mt-0.5 line-clamp-2 text-sm text-ink-soft">{h.snippet}</p>}
                {row.error && <p className="mt-1 text-sm font-bold text-tomato-dark">{row.error}</p>}
                {row.busy && <p className="mt-1 text-sm font-bold text-ink-soft" role="status">Reading the recipe…</p>}
              </div>
              {row.id ? (
                <Link href={`/recipes/${row.id}`} className="flex shrink-0 items-center gap-1 text-sm font-extrabold text-kale-ink underline">
                  <Check size={16} strokeWidth={3} aria-hidden /> Saved · View
                </Link>
              ) : h.saved ? (
                <span className="flex shrink-0 items-center gap-1 text-sm font-extrabold text-ink-soft">
                  <Check size={16} strokeWidth={3} aria-hidden /> In My Recipes
                </span>
              ) : (
                <button type="button" onClick={() => add(h.url)} disabled={row.busy} className="btn-crate shrink-0 px-3 py-2 text-sm" aria-label={`Add ${h.title} to My Recipes`}>
                  <Plus size={16} strokeWidth={3} aria-hidden /> {row.busy ? "Adding…" : "Add"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-xs font-bold text-ink-soft">Found with TinyFish web search. Added recipes are read from the page and link back to it.</p>
    </div>
  );
}
