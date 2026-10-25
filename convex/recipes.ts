import { v, Infer } from "convex/values";
import { mutation, MutationCtx, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireUserId } from "./model";
import { extractVideoId } from "../lib/recipes/youtubeUrlParser";

export const recipeFields = v.object({
  title: v.string(),
  sourceType: v.union(v.literal("web"), v.literal("youtube"), v.literal("crew")),
  sourceUrl: v.optional(v.string()),
  sourceName: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  servings: v.number(),
  totalMinutes: v.optional(v.number()),
  ingredients: v.array(
    v.object({
        raw: v.string(),
        name: v.string(),
        amount: v.number(),
        unit: v.string(),
        pantry: v.boolean(),
        fixed: v.optional(v.boolean()), // frying oil, pasta water: doesn't scale with servings
        madeInRecipe: v.optional(v.boolean()), // "garlic oil (from above)": made in an earlier step, not bought
      }),
  ),
  steps: v.array(v.string()),
});

const isHttp = (u?: string) => !u || /^https?:\/\//i.test(u);

/** Trims and checks a recipe before it's stored. */
function clean(r: Infer<typeof recipeFields>) {
  if (!r.title.trim()) throw new Error("A recipe needs a title");
  if (!(r.servings > 0 && r.servings <= 50)) throw new Error("Servings must be 1–50");
  if (r.ingredients.length === 0 || r.ingredients.length > 60) throw new Error("A recipe needs 1–60 ingredients");
  if (r.steps.length > 40) throw new Error("Too many steps");
  if (!isHttp(r.sourceUrl) || !isHttp(r.imageUrl)) throw new Error("Links must be web addresses");
  return {
    ...r,
    title: r.title.trim().slice(0, 120),
    sourceName: r.sourceName?.slice(0, 60),
    ingredients: r.ingredients.map((i) => ({
      ...i,
      raw: i.raw.slice(0, 200),
      name: i.name.slice(0, 80),
      unit: i.unit.slice(0, 20),
      amount: Math.min(Math.max(i.amount, 0), 10_000),
    })),
    steps: r.steps.map((s) => s.slice(0, 800)),
  };
}

/** Saves a recipe; the same link saved again updates the existing one instead of duplicating it. */
export async function saveRecipe(ctx: MutationCtx, userId: string, recipe: Infer<typeof recipeFields>): Promise<Id<"recipes">> {
  const r = clean(recipe);
  if (r.sourceUrl) {
    const existing = (
      await ctx.db.query("recipes").withIndex("by_user", (q) => q.eq("userId", userId)).collect()
    ).find((x) => x.sourceUrl === r.sourceUrl);
    if (existing) {
      await ctx.db.patch(existing._id, { ...r, unread: undefined });
      return existing._id;
    }
  }
  return await ctx.db.insert("recipes", { userId, ...r });
}

export const save = mutation({
  args: { recipe: recipeFields },
  handler: async (ctx, { recipe }) => saveRecipe(ctx, await requireUserId(ctx), recipe),
});

/** Playlist videos join My Recipes as "not read yet"; videos already saved (by video id) are skipped. Returns how many were added. */
export const addUnread = mutation({
  args: {
    videos: v.array(v.object({ videoId: v.string(), title: v.string(), channel: v.string(), thumbnail: v.optional(v.string()) })),
  },
  handler: async (ctx, { videos }) => {
    if (videos.length > 500) throw new Error("At most 500 videos per sync");
    const userId = await requireUserId(ctx);
    const saved = await ctx.db.query("recipes").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    const known = new Set(saved.flatMap((r) => (r.sourceUrl ? [extractVideoId(r.sourceUrl)] : [])));
    let added = 0;
    for (const video of videos) {
      if (!/^[A-Za-z0-9_-]{11}$/.test(video.videoId) || known.has(video.videoId)) continue;
      known.add(video.videoId);
      await ctx.db.insert("recipes", {
        userId,
        title: video.title.trim().slice(0, 120) || "Untitled video",
        sourceType: "youtube",
        sourceUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
        sourceName: video.channel.slice(0, 60),
        imageUrl: video.thumbnail && /^https:\/\//.test(video.thumbnail) ? video.thumbnail : undefined,
        servings: 4, // placeholder until the recipe is read
        ingredients: [],
        steps: [],
        unread: true,
      });
      added++;
    }
    return added;
  },
});

/** My Recipes, newest first. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return (await ctx.db.query("recipes").withIndex("by_user", (q) => q.eq("userId", userId)).collect()).reverse();
  },
});

/** One of your recipes, or null if it isn't yours or doesn't exist. */
export const get = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const recipeId = ctx.db.normalizeId("recipes", id);
    const recipe = recipeId ? await ctx.db.get(recipeId) : null;
    return recipe && recipe.userId === userId ? recipe : null;
  },
});

export const remove = mutation({
  args: { id: v.id("recipes") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const recipe = await ctx.db.get(id);
    if (!recipe || recipe.userId !== userId) throw new Error("Recipe not found");
    await ctx.db.delete(id);
  },
});
