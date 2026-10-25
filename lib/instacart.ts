// Instacart Developer Platform: turn the shopping list (or a recipe) into an Instacart page Tarik opens,
// picks a store on, and checks out. Docs: docs.instacart.com/developer_platform_api (products_link, recipe).
// Unit handling adapted from Tarik's Digero app (digero/convex/lib/instacartUtils.ts).

/** Kroger's 13-digit productId is a UPC-A without its check digit, left-padded; rebuild the 12-digit UPC. */
export function upcFromProductId(productId: string): string | undefined {
  if (!/^00\d{11}$/.test(productId)) return undefined;
  const body = productId.slice(2);
  let sum = 0;
  for (let i = 0; i < 11; i++) sum += Number(body[i]) * (i % 2 === 0 ? 3 : 1);
  return body + ((10 - (sum % 10)) % 10);
}

type Row = { name: string; productId?: string; productName?: string; size?: string; packs?: number; paid?: number };
type Measurement = { quantity: number; unit: string };
export type LineItem = { name: string; display_text: string; upcs?: string[]; line_item_measurements: Measurement[] };

/**
 * Unpaid rows (paid = already bought), one line per product: the exact item by UPC when one was chosen.
 * Tested on Instacart's sandbox: packaged items always arrive as quantity 1 (UPC or name, "each" or "package");
 * loose produce honours the count. The pack count is sent anyway; Tarik bumps packaged quantities in Instacart.
 */
export function listLineItems(rows: readonly Row[]): LineItem[] {
  const byKey = new Map<string, LineItem>();
  for (const r of rows) {
    if (r.paid !== undefined) continue;
    const upc = r.productId ? upcFromProductId(r.productId) : undefined;
    const k = upc ?? r.name.trim().toLowerCase();
    const packs = r.packs ?? 1;
    const same = byKey.get(k);
    if (same) {
      same.line_item_measurements[0].quantity += packs; // Instacart rejects the same UPC twice
      continue;
    }
    const name = (r.productName ?? r.name).slice(0, 120);
    byKey.set(k, {
      name,
      display_text: r.size ? `${name}, ${r.size}` : name,
      ...(upc ? { upcs: [upc] } : {}),
      line_item_measurements: [{ quantity: packs, unit: "each" }],
    });
  }
  return [...byKey.values()];
}

// Our recipe units → Instacart's. Anything else (clove, pinch, sprig, slice…) isn't how stores sell it: send 1 each.
const UNITS: Record<string, string> = {
  lb: "pound", lbs: "pound", pound: "pound", oz: "ounce", ounce: "ounce", g: "gram", gram: "gram", kg: "kilogram",
  cup: "cup", cups: "cup", tbsp: "tablespoon", tablespoon: "tablespoon", tsp: "teaspoon", teaspoon: "teaspoon",
  "fl oz": "fl oz", ml: "milliliter", l: "liter", liter: "liter", gallon: "gallon", quart: "quart", pint: "pint",
  ct: "each", each: "each", whole: "each", large: "large", medium: "medium", small: "small",
  bunch: "bunch", can: "can", head: "head", package: "package", pkg: "package", ear: "ears",
};

type Ingredient = { name: string; amount: number; unit: string; pantry: boolean; madeInRecipe?: boolean };
export type RecipeIngredient = { name: string; display_text: string; measurements: Measurement[] };

/** A recipe's ingredients for Instacart's recipe page (pantry staples included; the page lets him skip them). */
export function recipeIngredients(ingredients: readonly Ingredient[]): RecipeIngredient[] {
  return ingredients
    .filter((i) => !i.madeInRecipe)
    .map((i) => {
      const unit = UNITS[i.unit.trim().toLowerCase()];
      return {
        name: i.name,
        display_text: i.name,
        measurements: [unit && i.amount > 0 ? { quantity: Math.round(i.amount * 100) / 100, unit } : { quantity: 1, unit: "each" }],
      };
    });
}

// Dev keys work only on the dev server (a sandbox store); set INSTACART_API_BASE=https://connect.instacart.com with a production key.
const BASE = () => process.env.INSTACART_API_BASE ?? "https://connect.dev.instacart.tools";

export class InstacartError extends Error {}

/** POSTs to an Instacart page endpoint and returns the link to open. */
export async function createInstacartLink(path: "/idp/v1/products/products_link" | "/idp/v1/products/recipe", body: object): Promise<string> {
  const key = process.env.INSTACART_API_KEY;
  if (!key) throw new InstacartError("Instacart isn't set up yet (INSTACART_API_KEY).");
  const res = await fetch(`${BASE()}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    console.error(`Instacart ${path} ${res.status}:`, (await res.text()).slice(0, 500));
    throw new InstacartError(res.status === 429 ? "Instacart is busy. Try again in a moment." : "Instacart didn't accept the list. Try again?");
  }
  const { products_link_url } = (await res.json()) as { products_link_url?: string };
  if (!products_link_url?.startsWith("https://")) throw new InstacartError("Instacart sent back no link. Try again?");
  return products_link_url;
}
