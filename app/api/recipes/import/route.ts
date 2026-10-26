import { auth } from "@clerk/nextjs/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { convexToken } from "@/lib/convex-token";
import { importRecipe, ImportError } from "@/lib/recipes/import";

export const maxDuration = 120;

// POST { url } → { id }: reads a recipe website or YouTube link (same reader as the crew's) and saves it to My Recipes.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Not signed in" }, { status: 401 });
  const { url } = (await req.json().catch(() => ({}))) as { url?: unknown };
  if (typeof url !== "string" || !url.trim() || url.length > 2000) return Response.json({ error: "Paste a recipe link" }, { status: 400 });
  const token = await convexToken();
  if (!token) return Response.json({ error: "Not signed in" }, { status: 401 });
  try {
    const recipe = await importRecipe(url.trim());
    const id = await fetchMutation(api.recipes.save, { recipe }, { token });
    return Response.json({ id });
  } catch (err) {
    if (!(err instanceof ImportError)) console.error("Recipe import failed:", err);
    const error = err instanceof ImportError ? err.message : "I couldn't read that recipe. Try again in a minute.";
    return Response.json({ error }, { status: 422 });
  }
}
