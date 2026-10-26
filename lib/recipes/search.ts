// Finds recipe pages on the web with TinyFish Search, for the crew's "find me a recipe" answers.
export type RecipeHit = { title: string; url: string; site: string; snippet: string };

// Social and video sites rarely have a written recipe the reader can save.
const SKIP = "pinterest.com,reddit.com,facebook.com,instagram.com,tiktok.com,x.com,quora.com";

export async function searchRecipes(query: string, limit = 6): Promise<RecipeHit[]> {
  const key = process.env.TINYFISH_API_KEY;
  if (!key) throw new Error("TINYFISH_API_KEY missing");
  const q = new URLSearchParams({
    query: /recipe/i.test(query) ? query : `${query} recipe`,
    purpose: "find recipe web pages with an ingredient list and steps",
    exclude_domains: SKIP,
    location: "US",
  });
  const res = await fetch(`https://api.search.tinyfish.ai?${q}`, { headers: { "X-API-Key": key }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`TinyFish search failed: ${res.status}`);
  const data = (await res.json()) as { results?: { title?: string; url?: string; site_name?: string; snippet?: string }[] };
  return (data.results ?? [])
    .flatMap((r) => (r.url && r.title && /^https?:\/\//.test(r.url) ? [{ title: r.title.slice(0, 120), url: r.url, site: (r.site_name ?? new URL(r.url).hostname).replace(/^www\./, ""), snippet: (r.snippet ?? "").slice(0, 200) }] : []))
    .slice(0, limit);
}
