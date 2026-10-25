// Copied from Tarik's Digero app (digero/convex/lib/parseMicrodataRecipe.ts).
/**
 * Microdata Recipe Parser
 *
 * Utility function to extract Schema.org Recipe data from microdata/RDFa
 * markup in HTML content. This is a fallback when JSON-LD is not available.
 */

import type { ExtractedRecipeData, Confidence } from "./recipeTypes";

/**
 * Parse ISO 8601 duration to minutes
 * Handles formats like "PT30M", "PT1H30M", "PT1H", etc.
 */
function parseDuration(duration: string | null): number {
  if (!duration) return 0;

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!match) return 0;

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  return hours * 60 + minutes + Math.ceil(seconds / 60);
}

/**
 * Parse servings from recipe yield string
 */
function parseServings(yieldStr: string | null): number {
  if (!yieldStr) return 4;

  const match = yieldStr.match(/(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }

  return 4;
}

/**
 * Extract text content from itemprop elements
 */
function extractItemProp(html: string, propName: string): string | null {
  // Match itemprop with content attribute
  const contentRegex = new RegExp(
    `itemprop=["']${propName}["'][^>]*content=["']([^"']+)["']`,
    "i"
  );
  const contentMatch = html.match(contentRegex);
  if (contentMatch) {
    return contentMatch[1];
  }

  // Also check for content before itemprop
  const contentBeforeRegex = new RegExp(
    `content=["']([^"']+)["'][^>]*itemprop=["']${propName}["']`,
    "i"
  );
  const contentBeforeMatch = html.match(contentBeforeRegex);
  if (contentBeforeMatch) {
    return contentBeforeMatch[1];
  }

  // Match itemprop with text content (simplified - doesn't handle nested tags)
  const textRegex = new RegExp(
    `<[^>]*itemprop=["']${propName}["'][^>]*>([^<]+)<`,
    "i"
  );
  const textMatch = html.match(textRegex);
  if (textMatch) {
    return textMatch[1].trim();
  }

  return null;
}

/**
 * Extract image URL from itemprop="image"
 */
function extractImage(html: string): string | null {
  // Check for img with itemprop
  const imgRegex = /<img[^>]*itemprop=["']image["'][^>]*src=["']([^"']+)["']/i;
  const imgMatch = html.match(imgRegex);
  if (imgMatch) {
    return imgMatch[1];
  }

  // Also check for src before itemprop
  const imgBeforeRegex =
    /<img[^>]*src=["']([^"']+)["'][^>]*itemprop=["']image["']/i;
  const imgBeforeMatch = html.match(imgBeforeRegex);
  if (imgBeforeMatch) {
    return imgBeforeMatch[1];
  }

  // Check for content attribute on meta or other tags
  return extractItemProp(html, "image");
}

/**
 * Extract all ingredients from microdata
 */
function extractIngredients(html: string): string[] {
  const ingredients: string[] = [];

  // Match all recipeIngredient or ingredients itemprop
  const ingredientRegex =
    /<[^>]*itemprop=["'](?:recipeIngredient|ingredients)["'][^>]*>([^<]*)</gi;
  let match;

  while ((match = ingredientRegex.exec(html)) !== null) {
    const text = match[1].trim();
    if (text) {
      ingredients.push(text);
    }
  }

  // Also try content attribute format
  const contentRegex =
    /itemprop=["'](?:recipeIngredient|ingredients)["'][^>]*content=["']([^"']+)["']/gi;
  while ((match = contentRegex.exec(html)) !== null) {
    ingredients.push(match[1]);
  }

  return ingredients;
}

/**
 * Extract instructions from microdata
 */
function extractInstructions(html: string): string[] {
  const instructions: string[] = [];

  // Match recipeInstructions itemprop
  const instructionRegex =
    /<[^>]*itemprop=["'](?:recipeInstructions|instructions)["'][^>]*>([\s\S]*?)<\/[^>]+>/gi;
  let match;

  while ((match = instructionRegex.exec(html)) !== null) {
    // Strip HTML tags from content
    const text = match[1].replace(/<[^>]+>/g, " ").trim();
    if (text) {
      // Split on numbered steps or double newlines
      const steps = text
        .split(/(?:\d+\.\s*|\n\n+)/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      instructions.push(...steps);
    }
  }

  // Also try HowToStep format
  const stepRegex = /<[^>]*itemprop=["'](?:step|text)["'][^>]*>([^<]*)</gi;
  while ((match = stepRegex.exec(html)) !== null) {
    const text = match[1].trim();
    if (text && !instructions.includes(text)) {
      instructions.push(text);
    }
  }

  return instructions;
}

/**
 * Parse microdata/RDFa Recipe data from HTML content
 *
 * Extracts Schema.org Recipe markup using microdata format.
 * This is a fallback when JSON-LD is not available.
 *
 * @param html - Raw HTML content from the recipe page
 * @returns Parsed recipe data with confidence indicators, or null if not found
 */
export function parseMicrodataRecipe(html: string): ExtractedRecipeData | null {
  // Check if page contains Recipe itemtype
  const hasRecipeItemtype =
    html.includes('itemtype="http://schema.org/Recipe"') ||
    html.includes("itemtype='http://schema.org/Recipe'") ||
    html.includes('itemtype="https://schema.org/Recipe"') ||
    html.includes("itemtype='https://schema.org/Recipe'");

  // Also check for itemprop="name" which is common even without explicit itemtype
  const hasRecipeProps =
    html.includes('itemprop="recipeIngredient"') ||
    html.includes('itemprop="recipeInstructions"');

  if (!hasRecipeItemtype && !hasRecipeProps) {
    return null;
  }

  // Extract title
  const title = extractItemProp(html, "name");
  if (!title) {
    return null; // Title is required
  }

  // Extract other fields
  const imageUrl = extractImage(html);
  const ingredients = extractIngredients(html);
  const instructions = extractInstructions(html);
  const prepTimeStr = extractItemProp(html, "prepTime");
  const cookTimeStr = extractItemProp(html, "cookTime");
  const yieldStr = extractItemProp(html, "recipeYield");

  const prepTime = parseDuration(prepTimeStr);
  const cookTime = parseDuration(cookTimeStr);
  const servings = parseServings(yieldStr);

  // Build confidence indicators
  // Microdata is less reliable than JSON-LD due to parsing complexity
  const confidence: Record<string, Confidence> = {
    title: "high",
    imageUrl: imageUrl ? "medium" : "low",
    ingredients: ingredients.length > 0 ? "medium" : "low",
    instructions: instructions.length > 0 ? "medium" : "low",
    servings: yieldStr ? "medium" : "low",
    prepTime: prepTimeStr ? "medium" : "low",
    cookTime: cookTimeStr ? "medium" : "low",
  };

  return {
    title,
    imageUrl,
    ingredients: ingredients.map((ing) => ({
      raw: ing,
      parsed: null,
    })),
    instructions,
    servings,
    prepTime,
    cookTime,
    confidence,
    extractionMethod: "microdata",
  };
}
