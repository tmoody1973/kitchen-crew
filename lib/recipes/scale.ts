// Scales a recipe's ingredient amounts to the servings you're cooking. Real math, not a guess.

export type RecipeIngredient = {
  raw: string;
  name: string;
  amount: number;
  unit: string;
  pantry: boolean;
  fixed?: boolean; // frying oil, pasta water: the pot needs the same amount however many you feed
  madeInRecipe?: boolean; // made in an earlier step ("garlic oil (from above)"), so not bought
};

/** Rounds to what a cook would measure: whole numbers above 10, else up to 2 decimals. */
function tidy(n: number): number {
  return n >= 10 ? Math.round(n) : Math.round(n * 100) / 100;
}

// Whole things you can't buy a fraction of: round up. Pinches and dashes don't scale.
const WHOLE_UNITS = /^(ct|count|each|whole|piece|pieces|clove|cloves|can|cans|egg|eggs|large|medium|small|bunch|bunches|head|heads|stalk|stalks|sprig|sprigs)$/i;
const NO_SCALE = /^(pinch|pinches|dash|dashes|to taste|splash)$/i;

export function scaleIngredients<T extends { amount: number; unit: string; fixed?: boolean }>(ingredients: T[], fromServings: number, toServings: number): T[] {
  if (!(fromServings > 0) || !(toServings > 0)) return ingredients;
  const factor = toServings / fromServings;
  return ingredients.map((i) => {
    const unit = i.unit.trim();
    if (i.fixed || NO_SCALE.test(unit)) return i;
    const scaled = i.amount * factor;
    return { ...i, amount: WHOLE_UNITS.test(unit) ? Math.max(1, Math.ceil(scaled - 1e-6)) : tidy(scaled) };
  });
}
