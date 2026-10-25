// Turns a recipe link (website or YouTube) into a clean, structured recipe.
import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { parseJsonLdRecipe } from "./parseJsonLdRecipe";
import { parseMicrodataRecipe } from "./parseMicrodataRecipe";
import { extractVideoId, isYouTubeUrl } from "./youtubeUrlParser";
import { safeUrl } from "./safe-url";
import { fetchTranscript, fetchVideoInfo } from "./youtube";
import { recipeLinks } from "./links";
import type { RecipeIngredient } from "./scale";

export type ImportedRecipe = {
  title: string;
  sourceUrl: string;
  sourceType: "web" | "youtube";
  sourceName: string;
  imageUrl?: string;
  servings: number;
  totalMinutes?: number;
  ingredients: RecipeIngredient[];
  steps: string[];
};

export class ImportError extends Error {}

const MAX_HTML = 3_000_000;

async function fetchHtml(url: URL): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", Accept: "text/html" },
    signal: AbortSignal.timeout(15_000),
    redirect: "follow",
  });
  if (!res.ok) throw new ImportError(`That page answered ${res.status}.`);
  // A redirect could land somewhere private; check the final address too.
  if (!safeUrl(res.url)) throw new ImportError("That link redirects somewhere I can't open.");
  const html = await res.text();
  return html.slice(0, MAX_HTML);
}

function siteName(html: string, url: URL): string {
  const og = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)?.[1];
  return (og ?? url.hostname.replace(/^www\./, "")).slice(0, 60);
}

const ingredientsSchema = z.object({
  ingredients: z.array(
    z.object({
      raw: z.string(),
      name: z.string().describe("Plain grocery-store name, e.g. 'green curry paste', 'canned coconut milk'"),
      amount: z.number().positive().describe("Amount for the recipe's original servings; pick the first number of a range"),
      unit: z.string().describe("lb, oz, g, cup, tbsp, tsp, fl oz, ct, clove, bunch…"),
      pantry: z
        .boolean()
        .describe("true ONLY for salt, black pepper, water, plain cooking oil, and common dried spices; false for everything else, including wines, sauces, bouillon, and specialty items"),
      fixed: z.boolean().describe("true if the amount doesn't depend on servings: oil for deep-frying, water for boiling pasta"),
      madeInRecipe: z.boolean().describe("true if it's made in an earlier step of this recipe (e.g. 'garlic oil (from above)'), so not bought"),
    }),
  ),
});

/** Messy ingredient lines → clean name/amount/unit, for the recipe's original servings (scaling is code's job). */
async function cleanIngredients(lines: string[]): Promise<RecipeIngredient[]> {
  if (lines.length === 0) return [];
  const { output } = await generateText({
    model: anthropic("claude-haiku-5-5"),
    output: Output.object({ schema: ingredientsSchema }),
    instructions:
      "Convert each recipe ingredient line into a structured ingredient. Keep the original line in raw. " +
      "Skip section headers. When a line offers alternatives (\"X OR Y\", or a separate line for a homemade " +
      "version), keep only the first, store-bought option. Don't scale anything.",
    prompt: lines.map((l, i) => `${i + 1}. ${l}`).join("\n"),
  });
  return output.ingredients;
}

const videoRecipeSchema = z.object({
  isRecipe: z.boolean().describe("false if the video has no recipe you can extract"),
  title: z.string(),
  servings: z.number().positive(),
  ingredientLines: z.array(z.string()).describe("Each ingredient with its amount, as a cook would write it"),
  steps: z.array(z.string()),
});

/** Renders a page in TinyFish's browser (for sites that block plain fetching) and returns its text, or null. */
async function fetchWithTinyFish(url: URL): Promise<string | null> {
  const key = process.env.TINYFISH_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.fetch.tinyfish.ai", {
      method: "POST",
      headers: { "X-API-Key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ urls: [url.toString()], format: "markdown" }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      console.error(`TinyFish fetch ${res.status} for ${url}`);
      return null;
    }
    const data = (await res.json()) as { results?: { text?: unknown }[]; errors?: { error?: string }[] };
    const text = data.results?.[0]?.text;
    if (typeof text === "string" && text.trim()) return text.slice(0, 60_000);
    if (data.errors?.length) console.error(`TinyFish couldn't read ${url}: ${data.errors[0].error}`);
    return null;
  } catch (err) {
    console.error("TinyFish fetch failed:", err);
    return null;
  }
}

/** Claude reads a recipe out of a rendered page's text; null if the page has no recipe. */
async function extractFromPage(text: string) {
  const { output } = await generateText({
    model: anthropic("claude-sonnet-5-5"),
    output: Output.object({ schema: videoRecipeSchema }),
    instructions:
      "Extract the recipe from this web page. Copy ingredient amounts exactly as written; keep steps short and clear. " +
      "Ignore ads, comments, and other recipes linked on the page. If the page has no recipe, set isRecipe to false.",
    prompt: text,
  });
  return output.isRecipe && output.ingredientLines.length > 0 ? output : null;
}

/** A recipe from one of the video's description links, labelled as the video (so the playlist entry is filled in). */
async function recipeFromDescription(description: string): Promise<ImportedRecipe | null> {
  for (const link of recipeLinks(description).slice(0, 2)) {
    const page = safeUrl(link);
    if (!page) continue;
    try {
      return await importWebsite(page);
    } catch (err) {
      if (!(err instanceof ImportError)) console.error(`Reading ${link} failed:`, err);
    }
  }
  return null;
}

async function importYouTube(url: URL): Promise<ImportedRecipe> {
  const videoId = extractVideoId(url.toString());
  if (!videoId) throw new ImportError("I couldn't find the video in that YouTube link.");
  const info = await fetchVideoInfo(videoId);
  if (!info) throw new ImportError("I couldn't load that video.");

  // 1. Most channels link the written recipe in the description: the exact amounts, no guessing.
  const written = await recipeFromDescription(info.description);
  if (written) {
    return {
      ...written,
      sourceUrl: url.toString(),
      sourceType: "youtube",
      sourceName: info.channel.slice(0, 60),
      imageUrl: info.thumbnail ?? written.imageUrl,
      totalMinutes: written.totalMinutes ?? info.minutes,
    };
  }

  // 2. No usable link: read what the chef says, plus the description.
  const transcript = await fetchTranscript(videoId);

  // Transcript first: chefs say the real amounts out loud; descriptions are often promo text (approach from Digero).
  const { output } = await generateText({
    model: anthropic("claude-sonnet-5-5"),
    output: Output.object({ schema: videoRecipeSchema }),
    instructions:
      "Extract the recipe from this cooking video. The TRANSCRIPT is what the chef actually says while cooking: " +
      "prioritize it for ingredients, amounts, and steps. Use the description to fill gaps. " +
      "Write short, clear numbered-style steps. If amounts aren't stated, estimate sensible ones for the servings.",
    prompt: `VIDEO TITLE: ${info.title}\nCHANNEL: ${info.channel}\n\nTRANSCRIPT:\n${(transcript ?? "(no transcript)").slice(0, 20_000)}\n\nDESCRIPTION:\n${info.description.slice(0, 5_000)}`,
  });
  if (!output.isRecipe || output.ingredientLines.length === 0) {
    throw new ImportError("That video doesn't seem to include a recipe I can read. Paste the ingredients instead?");
  }
  return {
    title: output.title.slice(0, 120),
    sourceUrl: url.toString(),
    sourceType: "youtube",
    sourceName: info.channel.slice(0, 60),
    imageUrl: info.thumbnail,
    servings: output.servings,
    totalMinutes: info.minutes,
    ingredients: await cleanIngredients(output.ingredientLines.slice(0, 40)),
    steps: output.steps.slice(0, 30).map((s) => s.slice(0, 600)),
  };
}

async function importWebsite(url: URL): Promise<ImportedRecipe> {
  const html = await fetchHtml(url).catch((err) => {
    console.error(`Plain fetch of ${url} failed:`, err instanceof Error ? err.message : err);
    return null;
  });
  const data = html ? (parseJsonLdRecipe(html) ?? parseMicrodataRecipe(html)) : null;
  if (html && data?.title && data.ingredients.length > 0) {
    const minutes = data.prepTime + data.cookTime;
    return {
      title: data.title.slice(0, 120),
      sourceUrl: url.toString(),
      sourceType: "web",
      sourceName: siteName(html, url),
      imageUrl: data.imageUrl && safeUrl(data.imageUrl) ? data.imageUrl : undefined,
      servings: data.servings,
      totalMinutes: minutes > 0 ? minutes : undefined,
      ingredients: await cleanIngredients(data.ingredients.map((i) => i.raw).slice(0, 40)),
      steps: data.instructions.slice(0, 30).map((s) => s.slice(0, 600)),
    };
  }

  // Blocked, or no recipe data in the raw page: TinyFish renders it like a browser and Claude reads it.
  const text = await fetchWithTinyFish(url);
  const found = text ? await extractFromPage(text) : null;
  if (!found) {
    throw new ImportError(
      html ? "I couldn't find a recipe on that page. Paste the ingredients instead?" : "That site wouldn't let me in. Paste the ingredients instead?",
    );
  }
  return {
    title: found.title.slice(0, 120),
    sourceUrl: url.toString(),
    sourceType: "web",
    sourceName: html ? siteName(html, url) : url.hostname.replace(/^www\./, "").slice(0, 60),
    servings: found.servings,
    ingredients: await cleanIngredients(found.ingredientLines.slice(0, 40)),
    steps: found.steps.slice(0, 30).map((s) => s.slice(0, 600)),
  };
}

export async function importRecipe(link: string): Promise<ImportedRecipe> {
  const url = safeUrl(link);
  if (!url) throw new ImportError("That doesn't look like a web link I can open.");
  return isYouTubeUrl(url.toString()) ? importYouTube(url) : importWebsite(url);
}
