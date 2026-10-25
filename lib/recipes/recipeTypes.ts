// Copied from Tarik's Digero app (digero/convex/lib/recipeTypes.ts).
/**
 * Web Recipe Import Types
 *
 * Shared type definitions for recipe extraction and import functionality.
 */

/**
 * Confidence level for extracted fields
 */
export type Confidence = "high" | "medium" | "low";

/**
 * Ingredient category type (matches schema.ts)
 */
export type IngredientCategory =
  | "meat"
  | "produce"
  | "dairy"
  | "pantry"
  | "spices"
  | "condiments"
  | "bread"
  | "other";

/**
 * Raw ingredient from extraction (before categorization)
 */
export interface RawIngredient {
  /** Original raw ingredient string from the source */
  raw: string;
  /** Parsed ingredient data (if available from structured data) */
  parsed: {
    name: string;
    quantity: number;
    unit: string;
    category: IngredientCategory;
  } | null;
}

/**
 * Parsed and categorized ingredient ready for storage
 */
export interface ParsedIngredient {
  name: string;
  quantity: number;
  unit: string;
  category: IngredientCategory;
}

/**
 * Extracted recipe data from any source
 */
export interface ExtractedRecipeData {
  /** Recipe title */
  title: string | null;
  /** Recipe image URL */
  imageUrl: string | null;
  /** Raw ingredients (may need parsing/categorization) */
  ingredients: RawIngredient[];
  /** Instruction steps */
  instructions: string[];
  /** Number of servings */
  servings: number;
  /** Prep time in minutes */
  prepTime: number;
  /** Cook time in minutes */
  cookTime: number;
  /** Confidence levels for each extracted field */
  confidence: Record<string, Confidence>;
  /** Method used to extract this data */
  extractionMethod: "jsonld" | "microdata" | "ai";
}

/**
 * Error types for URL extraction
 */
export type ExtractionErrorType =
  | "INVALID_URL"
  | "FETCH_FAILED"
  | "TIMEOUT"
  | "PAYWALL_DETECTED"
  | "EXTRACTION_FAILED"
  | "NO_RECIPE_FOUND";

/**
 * Extraction result structure
 */
export interface ExtractionResult {
  success: boolean;
  data: ExtractedRecipeData | null;
  error: {
    type: ExtractionErrorType;
    message: string;
  } | null;
  sourceUrl: string;
}

/**
 * Final recipe data ready for database storage
 * This includes parsed ingredients and all required fields
 */
export interface FinalRecipeData {
  title: string;
  source: "website";
  sourceUrl: string;
  youtubeVideoId: null;
  imageUrl: string;
  servings: number;
  prepTime: number;
  cookTime: number;
  ingredients: ParsedIngredient[];
  instructions: string[];
  notes: string;
  confidence: Record<string, Confidence>;
}
