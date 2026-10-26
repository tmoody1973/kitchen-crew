import { auth } from "@clerk/nextjs/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { convexToken } from "@/lib/convex-token";
import { spendAllowance } from "@/lib/ai-allowance";
import { importRecipe, ImportError } from "@/lib/recipes/import";

export const maxDuration = 120;

// POST { id } → { ok }: reads a playlist video's recipe the first time it's opened, and saves it in place.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Not signed in" }, { status: 401 });
  const { id } = (await req.json().catch(() => ({}))) as { id?: unknown };
  if (typeof id !== "string" || id.length > 40) return Response.json({ error: "Send a recipe id" }, { status: 400 });
  const token = await convexToken();
  if (!token) return Response.json({ error: "Not signed in" }, { status: 401 });

  const saved = await fetchQuery(api.recipes.get, { id }, { token });
  if (!saved) return Response.json({ error: "Recipe not found" }, { status: 404 });
  if (!saved.unread || !saved.sourceUrl) return Response.json({ ok: true });
  const limited = await spendAllowance("recipe", token);
  if (limited) return Response.json({ error: limited }, { status: 429 });
  try {
    const recipe = await importRecipe(saved.sourceUrl);
    // Same link → saveRecipe updates this entry and clears "not read yet".
    await fetchMutation(api.recipes.save, { recipe: { ...recipe, imageUrl: recipe.imageUrl ?? saved.imageUrl } }, { token });
    return Response.json({ ok: true });
  } catch (err) {
    if (!(err instanceof ImportError)) console.error("Reading playlist recipe failed:", err);
    const error = err instanceof ImportError ? err.message : "I couldn't read that recipe. Try again in a minute.";
    return Response.json({ error }, { status: 422 });
  }
}
