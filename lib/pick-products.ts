// Claude picks the right Kroger product for each ingredient by meaning (canned coconut milk, not the drinking carton).
import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { Product } from "./meal-plan";

export type Candidates = { name: string; dish: string; amountText: string; options: Product[] };

const picksSchema = z.object({
  picks: z.array(
    z.object({
      item: z.number().int().describe("The ingredient's number from the list"),
      productId: z.string().nullable(),
      packs: z.number().int().min(1).max(50).describe("How many of that product to buy to cover the amount needed"),
      substitute: z
        .string()
        .nullable()
        .describe("Only when productId is null: a common US-supermarket substitute to search for instead, else null"),
    }),
  ),
});

export type Picks = { products: Map<string, Product | null>; substitutes: Map<string, string> };

/**
 * One small, cheap model call for the whole list.
 * products: name → chosen product (null = nothing fits); substitutes: name → swap to search for when nothing fits.
 */
export async function pickProducts(list: Candidates[]): Promise<Picks> {
  const chosen = new Map<string, Product | null>(list.map((c) => [c.name.toLowerCase(), null]));
  const substitutes = new Map<string, string>();
  // Items Kroger returned nothing for still get a substitute suggestion (listed with no options).
  if (list.length === 0) return { products: chosen, substitutes };

  const prompt = list
    .map(
      (c, n) =>
        `${n + 1}. Ingredient: ${c.name} (${c.amountText}, for ${c.dish})\n` +
        (c.options.length
          ? c.options.map((o) => `  - id ${o.productId}: ${o.name}${o.size ? `, ${o.size}` : ""}, $${o.price}`).join("\n")
          : "  (no store matches)"),
    )
    .join("\n\n");

  const { output } = await generateText({
    model: anthropic("claude-haiku-5-5"),
    output: Output.object({ schema: picksSchema }),
    instructions:
      "For each ingredient, choose the store product a home cook would actually buy for that recipe. " +
      "Prefer the plain, everyday version over flavored, prepared, or novelty items, and a sensible size. " +
      "Use null if no option is really that ingredient. Only use ids from the list. " +
      "For packs, say how many of that product covers the amount needed (3 carrots → 1 bag; 2 cans → 2; 3 cloves garlic → 1 bulb). " +
      "If no option is really the ingredient, set productId null and suggest the closest everyday substitute a cook would use " +
      "for that dish (e.g. zha cai → kimchi, Taiwanese cooking rice wine → dry sherry, mushroom bouillon → vegetable bouillon).",
    prompt,
  });

  for (const pick of output.picks) {
    // Match by number, not name: Claude may reword "Thai green curry paste", but item 3 is item 3.
    const c = list[pick.item - 1];
    // Ignore any id that wasn't offered, so the model can't invent a product.
    const product = c?.options.find((o) => o.productId === pick.productId);
    if (!c) continue;
    chosen.set(c.name.toLowerCase(), product ? { ...product, suggestedPacks: pick.packs } : null);
    if (!product && pick.substitute) substitutes.set(c.name.toLowerCase(), pick.substitute.slice(0, 60));
  }
  return { products: chosen, substitutes };
}
