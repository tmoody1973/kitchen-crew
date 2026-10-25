import { auth } from "@clerk/nextjs/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { convexToken } from "@/lib/convex-token";
import { autoTag } from "@/lib/recipes/auto-tag";

export const maxDuration = 120;

const MAX = 100;

// POST → { tagged }: tags recipes that have never been tagged (new playlist videos, pasted links, the crew's dinners).
export async function POST() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Not signed in" }, { status: 401 });
  const token = await convexToken();
  if (!token) return Response.json({ error: "Not signed in" }, { status: 401 });

  const untagged = (await fetchQuery(api.recipes.mine, {}, { token })).filter((r) => r.tags === undefined).slice(0, MAX);
  if (untagged.length === 0) return Response.json({ tagged: 0 });
  try {
    const tags = await autoTag(
      untagged.map((r) => ({ title: r.title, channel: r.sourceName, ingredients: r.ingredients.map((i) => i.name) })),
    );
    await fetchMutation(api.recipes.setTags, { updates: untagged.map((r, n) => ({ id: r._id, tags: tags[n] })) }, { token });
    return Response.json({ tagged: untagged.length });
  } catch (err) {
    console.error("Auto-tagging failed:", err);
    return Response.json({ error: "Couldn't tag recipes right now." }, { status: 502 });
  }
}
