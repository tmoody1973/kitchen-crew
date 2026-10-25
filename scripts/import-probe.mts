// Imports real recipe links end to end (website + YouTube).
// Run: npx tsx --env-file=.env.local scripts/import-probe.mts [url]
import { importRecipe } from "../lib/recipes/import";
import { scaleIngredients } from "../lib/recipes/scale";

async function show(url: string) {
  const t = Date.now();
  const r = await importRecipe(url);
  console.log(`\n${r.title} — ${r.sourceType} · ${r.sourceName} · serves ${r.servings} · ${r.totalMinutes ?? "?"} min · ${((Date.now() - t) / 1000).toFixed(1)} s`);
  console.log(`  ${r.ingredients.length} ingredients, ${r.steps.length} steps, image: ${r.imageUrl ? "yes" : "no"}`);
  const scaled = scaleIngredients(r.ingredients, r.servings, 3.5);
  r.ingredients.slice(0, 4).forEach((i, n) => console.log(`  "${i.raw.slice(0, 50)}" → ${i.amount} ${i.unit} ${i.name}${i.pantry ? " [pantry]" : ""} → for 3½: ${scaled[n].amount} ${i.unit}`));
  console.log(`  step 1: ${r.steps[0]?.slice(0, 90)}`);
}

let url = process.argv[2];
if (!url) {
  await show("https://www.recipetineats.com/thai-green-curry/");
  const q = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=easy+chicken+stir+fry+recipe&key=${process.env.YOUTUBE_API_KEY}`);
  const id = ((await q.json()) as any).items?.[0]?.id?.videoId;
  url = `https://www.youtube.com/watch?v=${id}`;
}
await show(url);
