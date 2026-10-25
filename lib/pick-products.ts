// Claude picks the right Kroger product for each ingredient by meaning (canned coconut milk, not the drinking carton).
import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { Product } from "./meal-plan";

export type Candidates = { name: string; dish: string; amountText: string; options: Product[] };

const picksSchema = z.object({
  picks: z.array(
    z.object({
      ingredient: z.string(),
      productId: z.string().nullable(),
      packs: z.number().int().min(1).max(50).describe("How many of that product to buy to cover the amount needed"),
    }),
  ),
});

/** One small, cheap model call for the whole list. Returns name → chosen product (null = nothing fits). */
export async function pickProducts(list: Candidates[]): Promise<Map<string, Product | null>> {
  const withOptions = list.filter((c) => c.options.length > 0);
  const chosen = new Map<string, Product | null>(list.map((c) => [c.name.toLowerCase(), null]));
  if (withOptions.length === 0) return chosen;

  const prompt = withOptions
    .map(
      (c) =>
        `Ingredient: ${c.name} (${c.amountText}, for ${c.dish})\n` +
        c.options.map((o) => `  - id ${o.productId}: ${o.name}${o.size ? `, ${o.size}` : ""}, $${o.price}`).join("\n"),
    )
    .join("\n\n");

  const { output } = await generateText({
    model: anthropic("claude-haiku-5-5"),
    output: Output.object({ schema: picksSchema }),
    instructions:
      "For each ingredient, choose the store product a home cook would actually buy for that recipe. " +
      "Prefer the plain, everyday version over flavored, prepared, or novelty items, and a sensible size. " +
      "Use null if no option is really that ingredient. Only use ids from the list. " +
      "For packs, say how many of that product covers the amount needed (3 carrots → 1 bag; 2 cans → 2; 3 cloves garlic → 1 bulb).",
    prompt,
  });

  for (const pick of output.picks) {
    const c = withOptions.find((x) => x.name.toLowerCase() === pick.ingredient.toLowerCase());
    // Ignore any id that wasn't offered, so the model can't invent a product.
    const product = c?.options.find((o) => o.productId === pick.productId);
    if (c) chosen.set(c.name.toLowerCase(), product ? { ...product, suggestedPacks: pick.packs } : null);
  }
  return chosen;
}
