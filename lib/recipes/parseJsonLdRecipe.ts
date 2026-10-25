// Copied from Tarik's Digero app (digero/convex/lib/parseJsonLdRecipe.ts).
/**
 * JSON-LD Recipe Parser
 *
 * Utility function to extract Schema.org Recipe data from JSON-LD script tags
 * in HTML content. This is the preferred structured data format for most
 * modern recipe websites.
 */

import type { ExtractedRecipeData, Confidence } from "./recipeTypes";

/**
 * Schema.org Recipe type (partial - only fields we extract)
 */
interface SchemaRecipe {
  "@type"?: string;
  name?: string;
  image?: string | string[] | { url?: string }[];
  recipeIngredient?: string[];
  ingredients?: string[];
  recipeInstructions?:
    | string
    | string[]
    | { "@type"?: string; text?: string; name?: string }[];
  recipeYield?: string | number | string[];
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  description?: string;
  author?: string | { name?: string };
  datePublished?: string;
}

/**
 * Parse ISO 8601 duration to minutes
 * Handles formats like "PT30M", "PT1H30M", "PT1H", etc.
 */
function parseDuration(duration: string | undefined): number {
  if (!duration) return 0;

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!match) return 0;

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  return hours * 60 + minutes + Math.ceil(seconds / 60);
}

/**
 * Parse servings from recipe yield
 * Handles formats like "4", "4 servings", "Makes 6", etc.
 */
function parseServings(
  recipeYield: string | number | string[] | undefined
): number {
  if (!recipeYield) return 4; // Default

  if (typeof recipeYield === "number") {
    return recipeYield;
  }

  const yieldStr = Array.isArray(recipeYield)
    ? recipeYield[0]
    : recipeYield;

  if (typeof yieldStr === "string") {
    const match = yieldStr.match(/(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  return 4; // Default
}

/**
 * Extract image URL from various image formats
 */
function extractImageUrl(
  image: string | string[] | { url?: string }[] | undefined
): string | null {
  if (!image) return null;

  if (typeof image === "string") {
    return image;
  }

  if (Array.isArray(image)) {
    const first = image[0];
    if (typeof first === "string") {
      return first;
    }
    if (first && typeof first === "object" && "url" in first) {
      return first.url || null;
    }
  }

  return null;
}

/**
 * Parse instructions from various formats
 */
function parseInstructions(
  instructions:
    | string
    | string[]
    | { "@type"?: string; text?: string; name?: string }[]
    | undefined
): string[] {
  if (!instructions) return [];

  if (typeof instructions === "string") {
    // Split on numbered steps or newlines
    return instructions
      .split(/(?:\d+\.\s*|\n+)/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  if (Array.isArray(instructions)) {
    return instructions
      .map((item) => {
        if (typeof item === "string") {
          return item.trim();
        }
        if (typeof item === "object" && item) {
          // HowToSection: its steps live in itemListElement (Kitchen Crew fix; Digero kept only the section title)
          const nested = (item as { itemListElement?: unknown }).itemListElement;
          if (Array.isArray(nested)) return parseInstructions(nested as { text?: string; name?: string }[]).join("\u0000");
          // HowToStep
          return (item.text || item.name || "").trim();
        }
        return "";
      })
      .flatMap((s) => s.split("\u0000"))
      .filter((s) => s.length > 0);
  }

  return [];
}

/**
 * Parse JSON-LD Recipe data from HTML content
 *
 * Extracts JSON-LD script tags and looks for Schema.org Recipe markup.
 * Returns parsed recipe data or null if no valid Recipe data found.
 *
 * @param html - Raw HTML content from the recipe page
 * @returns Parsed recipe data with confidence indicators, or null if not found
 */
export function parseJsonLdRecipe(html: string): ExtractedRecipeData | null {
  // Find all JSON-LD script tags
  const jsonLdRegex =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const matches = html.matchAll(jsonLdRegex);

  for (const match of matches) {
    try {
      const jsonContent = match[1].trim();
      const data = JSON.parse(jsonContent);

      // Handle both single object and array formats
      const items = Array.isArray(data) ? data : [data];

      // Also handle @graph format
      if (data["@graph"] && Array.isArray(data["@graph"])) {
        items.push(...data["@graph"]);
      }

      // Find Recipe type
      for (const item of items) {
        if (
          item["@type"] === "Recipe" ||
          (Array.isArray(item["@type"]) && item["@type"].includes("Recipe"))
        ) {
          const recipe = item as SchemaRecipe;

          // Extract title
          const title = recipe.name || null;
          if (!title) continue; // Title is required, skip if not found

          // Extract other fields
          const imageUrl = extractImageUrl(recipe.image);
          const ingredients = recipe.recipeIngredient || recipe.ingredients || [];
          const instructions = parseInstructions(recipe.recipeInstructions);
          const servings = parseServings(recipe.recipeYield);
          const prepTime = parseDuration(recipe.prepTime);
          const cookTime = parseDuration(recipe.cookTime);

          // Build result with confidence indicators
          // JSON-LD data is highly reliable, so confidence is high for present fields
          const confidence: Record<string, Confidence> = {
            title: "high",
            imageUrl: imageUrl ? "high" : "low",
            ingredients: ingredients.length > 0 ? "high" : "low",
            instructions: instructions.length > 0 ? "high" : "low",
            servings: recipe.recipeYield ? "high" : "medium",
            prepTime: recipe.prepTime ? "high" : "low",
            cookTime: recipe.cookTime ? "high" : "low",
          };

          return {
            title,
            imageUrl,
            ingredients: ingredients.map((ing) => ({
              raw: ing,
              parsed: null, // Will be parsed by Gemini if needed
            })),
            instructions,
            servings,
            prepTime,
            cookTime,
            confidence,
            extractionMethod: "jsonld",
          };
        }
      }
    } catch {
      // JSON parsing failed, continue to next match
      continue;
    }
  }

  return null;
}
