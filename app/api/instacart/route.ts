import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { convexToken } from "@/lib/convex-token";
import { createInstacartLink, InstacartError, listLineItems, recipeIngredients } from "@/lib/instacart";
import { scaleIngredients } from "@/lib/recipes/scale";

// POST { offset } → this week's (0) or next week's (1) unpaid list as an Instacart page.
// POST { recipeId, servings } → one recipe, scaled, as an Instacart recipe page.
// Either way → { url }. Items are read from the database here, never taken from the browser.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Not signed in" }, { status: 401 });
  const token = await convexToken();
  if (!token) return Response.json({ error: "Not signed in" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { offset?: unknown; recipeId?: unknown; servings?: unknown };

  try {
    if (typeof body.recipeId === "string") {
      const servings = Number(body.servings);
      if (!(servings >= 1 && servings <= 12)) return Response.json({ error: "Servings must be 1–12" }, { status: 400 });
      const recipe = await fetchQuery(api.recipes.get, { id: body.recipeId }, { token });
      if (!recipe || recipe.unread) return Response.json({ error: "Open the recipe first so it can be read." }, { status: 400 });
      const url = await createInstacartLink("/idp/v1/products/recipe", {
        title: recipe.title,
        link_type: "recipe",
        servings: Math.round(servings),
        ...(recipe.totalMinutes ? { cooking_time: recipe.totalMinutes } : {}),
        ...(recipe.sourceName ? { author: recipe.sourceName } : {}),
        instructions: recipe.steps,
        ingredients: recipeIngredients(scaleIngredients(recipe.ingredients, recipe.servings, servings)),
        landing_page_configuration: { enable_pantry_items: true },
      });
      return Response.json({ url });
    }

    const offset = body.offset === 1 ? 1 : 0;
    const lineItems = listLineItems(await fetchQuery(api.listItems.mine, { offset }, { token }));
    if (lineItems.length === 0) return Response.json({ error: "Everything on the list is already paid for." }, { status: 400 });
    const url = await createInstacartLink("/idp/v1/products/products_link", {
      title: offset === 1 ? "Mise · next week's groceries" : "Mise · this week's groceries",
      link_type: "shopping_list",
      expires_in: 30,
      line_items: lineItems.slice(0, 200),
    });
    return Response.json({ url });
  } catch (err) {
    if (err instanceof InstacartError) return Response.json({ error: err.message }, { status: 502 });
    console.error("Send to Instacart failed:", err);
    return Response.json({ error: "Couldn't reach Instacart. Try again in a minute." }, { status: 502 });
  }
}
