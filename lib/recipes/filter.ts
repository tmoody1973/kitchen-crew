// My Recipes search and tag chips. Runs in the browser over the whole shelf.
// ponytail: plain filter over ~100 recipes; move to a Convex search index if the shelf passes ~1,000.

type Searchable = { title: string; tags?: string[]; sourceName?: string; ingredients: { name: string }[] };

/** Recipes matching every word of the search (in title, tags, ingredients, or channel) and carrying every chosen tag. */
export function filterRecipes<T extends Searchable>(recipes: readonly T[], search: string, chips: readonly string[]): T[] {
  const words = search.toLowerCase().split(/\s+/).filter(Boolean);
  return recipes.filter((r) => {
    if (!chips.every((c) => r.tags?.includes(c))) return false;
    const text = [r.title, r.sourceName ?? "", ...(r.tags ?? []), ...r.ingredients.map((i) => i.name)].join(" ").toLowerCase();
    return words.every((w) => text.includes(w));
  });
}

/** The n most used tags across the shelf (ties alphabetical), for the filter chips. */
export function topTags(recipes: readonly { tags?: string[] }[], n: number): string[] {
  const counts = new Map<string, number>();
  for (const t of recipes.flatMap((r) => r.tags ?? [])) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n).map(([t]) => t);
}
