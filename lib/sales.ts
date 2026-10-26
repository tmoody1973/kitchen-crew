// What's on sale: plain code over Kroger's prices, so the crew only ever repeats these numbers.
import { matchScore, type Product } from "./kroger";

export type SaleScope = "needed" | "regulars" | "recipes";
export type Sale = {
  item: string; // what you asked about: a list item, a regular, or a recipe ingredient
  productId: string;
  name: string;
  size?: string;
  price: number;
  regularPrice: number;
  save: number; // per package
  imageUrl?: string;
  recipes?: { id: string; title: string }[]; // scope "recipes": saved recipes that use this ingredient
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function toSale(item: string, p: Product | undefined): Sale | null {
  if (!p?.regularPrice || p.regularPrice <= p.price) return null;
  return { item, productId: p.productId, name: p.name, size: p.size, price: p.price, regularPrice: p.regularPrice, save: round2(p.regularPrice - p.price), imageUrl: p.imageUrl };
}

/**
 * A sale on the ingredient itself: among Kroger's first 3 products whose name has every word of the
 * ingredient (Kroger's order is its relevance), the biggest saving. Null when none of those is on sale.
 * ponytail: word match, so "butter" can still match butter cookies if Kroger ranks them top 3.
 */
export function bestSale(term: string, options: Product[]): Sale | null {
  const sales = options.filter((p) => matchScore(term, p.name) > 0).slice(0, 3).flatMap((p) => toSale(term, p) ?? []);
  return sales.sort(bySaving)[0] ?? null;
}

type RecipeLike = { _id: string; title: string; unread?: boolean; ingredients: { name: string; pantry: boolean; madeInRecipe?: boolean }[] };

/** The ingredients your saved recipes use most (bought ones only), with the recipes that use each. */
export function topIngredients(recipes: RecipeLike[], limit: number): { name: string; recipes: { id: string; title: string }[] }[] {
  const uses = new Map<string, { name: string; recipes: { id: string; title: string }[] }>();
  for (const r of recipes) {
    if (r.unread) continue;
    const seen = new Set<string>();
    for (const i of r.ingredients) {
      const k = i.name.trim().toLowerCase();
      if (!k || i.pantry || i.madeInRecipe || seen.has(k)) continue;
      seen.add(k);
      const entry = uses.get(k) ?? { name: i.name.trim(), recipes: [] };
      uses.set(k, { ...entry, recipes: [...entry.recipes, { id: r._id, title: r.title }] });
    }
  }
  return [...uses.values()].sort((a, b) => b.recipes.length - a.recipes.length).slice(0, limit);
}

export const bySaving = (a: Sale, b: Sale) => b.save - a.save;
