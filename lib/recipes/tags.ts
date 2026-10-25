// The tags Claude picks from when it tags recipes. A fixed list keeps the filter chips tidy
// ("chicken", never also "Chicken" or "poultry"); Tarik can still add his own words on a recipe.
export const TAG_GROUPS = {
  cuisine: [
    "american", "cajun", "chinese", "filipino", "french", "greek", "indian", "indonesian", "italian",
    "japanese", "korean", "mediterranean", "mexican", "middle eastern", "peruvian", "thai", "vietnamese",
  ],
  protein: ["beef", "chicken", "eggs", "lamb", "pork", "seafood", "tofu", "vegetarian"],
  dish: ["bread", "breakfast", "dessert", "noodles", "pasta", "pizza", "rice", "salad", "sandwich", "sauce", "side", "soup", "stew", "tacos"],
  traits: ["comfort", "copycat", "grilled", "healthy", "make-ahead", "one-pan", "quick", "spicy"],
} as const;

export const ALL_TAGS = Object.values(TAG_GROUPS).flat() as [string, ...string[]];
