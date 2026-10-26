// Pantry Box mode: what usually comes in a food-pantry box, and which plan items the box covers.

/** Common shelf-stable pantry-box foods (USDA Foods / TEFAP-style), for the quick checklist. */
export const COMMON_BOX_ITEMS = [
  "canned green beans", "canned corn", "canned peas", "canned carrots", "canned diced tomatoes", "tomato sauce",
  "canned black beans", "canned pinto beans", "canned kidney beans", "dry beans", "canned chicken", "canned tuna",
  "canned salmon", "peanut butter", "white rice", "brown rice", "pasta", "spaghetti sauce", "oatmeal", "cereal",
  "shelf-stable milk", "canned peaches", "canned pears", "applesauce", "raisins", "canned soup", "potatoes",
  "onions", "apples", "bread", "eggs", "cheese", "frozen chicken", "ground beef", "flour", "vegetable oil",
];

// Packaging and variety words that don't change what the food is ("canned green beans" is green beans).
const DESCRIPTORS = new Set(["canned", "can", "dry", "dried", "frozen", "fresh", "shelf-stable", "shelf", "stable", "white", "brown", "long-grain", "whole", "low-sodium", "no-salt-added"]);
const core = (s: string) =>
  s.toLowerCase().replace(/[^a-z\s-]/g, " ").split(/\s+/).filter((w) => w && !DESCRIPTORS.has(w)).map((w) => (w.endsWith("es") && w.length > 4 ? w.slice(0, -1) : w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w)).join(" ");

/**
 * A plan ingredient counts as "from the box" only when, minus packaging words and plurals, it's the same food
 * ("green beans" = "canned green beans", "rice" = "white rice"; "butter" ≠ "peanut butter", "chicken thighs" ≠ "canned chicken").
 */
export function boxCovers(ingredient: string, boxItems: readonly string[]): boolean {
  const ing = core(ingredient);
  return ing !== "" && boxItems.some((b) => core(b) === ing);
}

/** Of a plan's ingredients, the ones the box covers. */
export function fromBox(ingredients: readonly { name: string; pantry: boolean }[], boxItems: readonly string[]): string[] {
  if (boxItems.length === 0) return [];
  return ingredients.filter((i) => i.pantry && boxCovers(i.name, boxItems)).map((i) => i.name);
}
