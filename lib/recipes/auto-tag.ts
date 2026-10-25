// Claude Haiku tags recipes from the fixed list: a whole playlist sync in a couple of calls.
import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { ALL_TAGS, TAG_GROUPS } from "./tags";

export type TagInput = { title: string; channel?: string; ingredients?: string[] };

const BATCH = 50;

const schema = z.object({
  recipes: z.array(z.object({ n: z.number().int(), tags: z.array(z.enum(ALL_TAGS)).max(8) })),
});

async function tagBatch(items: TagInput[]): Promise<string[][]> {
  const { output } = await generateText({
    model: anthropic("claude-haiku-5-5"),
    output: Output.object({ schema }),
    instructions:
      "Tag each recipe for a home cook's recipe shelf. Pick 2–6 tags from the allowed list: one cuisine if clear, " +
      "the main protein (or vegetarian when there's no meat or seafood), the kind of dish, and traits that clearly apply " +
      "(quick = about 30 minutes or less; copycat = imitates a restaurant dish; comfort = cozy, hearty food). " +
      "Judge from the title, channel, and ingredients when given. Don't guess traits the recipe doesn't show.\n" +
      Object.entries(TAG_GROUPS).map(([group, tags]) => `${group}: ${tags.join(", ")}`).join("\n"),
    prompt: items
      .map((r, n) => `${n + 1}. ${r.title}${r.channel ? ` (${r.channel})` : ""}${r.ingredients?.length ? ` — ${r.ingredients.slice(0, 15).join(", ")}` : ""}`)
      .join("\n"),
  });
  const byNumber = new Map(output.recipes.map((r) => [r.n, [...new Set(r.tags)]]));
  return items.map((_, n) => byNumber.get(n + 1) ?? []);
}

/** Tags for each recipe, in the same order (an empty list if Claude skipped one). */
export async function autoTag(items: TagInput[]): Promise<string[][]> {
  const batches = [];
  for (let i = 0; i < items.length; i += BATCH) batches.push(tagBatch(items.slice(i, i + BATCH)));
  return (await Promise.all(batches)).flat();
}
