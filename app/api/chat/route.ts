import { auth } from "@clerk/nextjs/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { anthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  tool,
  toUIMessageStream,
  UIMessage,
} from "ai";
import { api } from "@/convex/_generated/api";
import { productsById, rankByRelevance, searchCandidates, Product } from "@/lib/kroger";
import { bestSale, bySaving, toSale, topIngredients, type Sale } from "@/lib/sales";
import { mergeIngredients, planToolSchema, pricePlan, resolvePlan, validatePlan, PlanToolOutput } from "@/lib/meal-plan";
import { importRecipe, ImportError } from "@/lib/recipes/import";
import { searchRecipes } from "@/lib/recipes/search";
import { findFoodHelp } from "@/lib/food-help";
import { scaleIngredients } from "@/lib/recipes/scale";
import { pickProducts } from "@/lib/pick-products";
import { staffPrompt } from "@/lib/staff-prompt";
import { actualPaid, computeSplitTally, computeTally, isWeekActive } from "@/lib/tally";
import { PLAN_LABELS, suggestedBudget } from "@/lib/usda";
import { describeHousehold, targetServings } from "@/lib/household";
import { z } from "zod";
import { convexToken } from "@/lib/convex-token";

export const maxDuration = 300; // a plan may read a few playlist videos before pricing

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { messages, removedMeals } = (await req.json().catch(() => ({}))) as {
    messages?: UIMessage[];
    removedMeals?: unknown;
  };
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 60) {
    return Response.json({ error: "Send 1–60 messages" }, { status: 400 });
  }
  // Dinners removed on the latest plan card, so a later "swap Thursday" works from the edited plan.
  const removed = Array.isArray(removedMeals)
    ? removedMeals.filter((m): m is string => typeof m === "string").map((m) => m.slice(0, 100)).slice(0, 14)
    : [];

  // What's left this week, from Convex, so Claude and the Budget Fit card see real numbers.
  const token = (await convexToken()) ?? undefined;
  const [week, items, pantry, household, savedRecipes, receipts] = await Promise.all([
    fetchQuery(api.weeks.latest, {}, { token }),
    fetchQuery(api.listItems.mine, {}, { token }),
    fetchQuery(api.pantry.mine, {}, { token }),
    fetchQuery(api.household.mine, {}, { token }),
    fetchQuery(api.recipes.mine, {}, { token }),
    fetchQuery(api.receipts.forWeek, {}, { token }),
  ]);
  // Recipes imported during this chat join the saved list, so the crew can plan with them right away.
  const recipesById = new Map(savedRecipes.map((r) => [r._id as string, r]));
  const pantrySets = {
    have: new Set(pantry.filter((p) => p.have).map((p) => p.name)),
    out: new Set(pantry.filter((p) => !p.have).map((p) => p.name)),
  };
  const servings = targetServings(household);
  // No active week is fine for budget help; meal plans need one.
  const activeWeek = week && isWeekActive(week.startDate, Date.now()) ? week : null;
  const fullTally = activeWeek
    ? computeTally(activeWeek.budget, actualPaid(items, receipts), activeWeek.startDate, Date.now())
    : null;
  // With a Dinners/Extras split, the crew and the Budget Fit card plan against what's left of the Dinners share.
  const tally =
    activeWeek && fullTally && activeWeek.extrasBudget
      ? { ...fullTally, left: computeSplitTally(activeWeek.budget, activeWeek.extrasBudget, items, activeWeek.startDate, Date.now()).dinner.left }
      : fullTally;

  const result = streamText({
    model: anthropic("claude-sonnet-5-5"),
    instructions: staffPrompt({
      remaining: tally?.left,
      daysLeft: tally?.daysLeft,
      storeName: activeWeek?.storeName,
      removedMeals: removed,
      pantryHave: pantry.filter((p) => p.have).map((p) => p.name),
      pantryOut: pantry.filter((p) => !p.have).map((p) => p.name),
      servings,
      leftovers: household.leftovers,
      savedRecipes: savedRecipes.slice(0, 150).map((r) => ({ id: r._id, title: r.title, tags: r.tags })),
      name: household.name,
      household: household.members ? describeHousehold(household.members) : undefined,
    }),
    messages: await convertToModelMessages(messages),
    stopWhen: isStepCount(5), // import → plan → (retry once) → closing line
    tools: {
      proposeMealPlan: tool({
        description:
          "Show the cook a costed meal plan card. Call only after you know the kind of dishes and the number of days.",
        inputSchema: planToolSchema,
        // A generator: each `yield` before the last is a progress update for the chat's progress bar.
        execute: async function* (input): AsyncGenerator<PlanToolOutput> {
          // Playlist videos are read the first time a plan uses them.
          const unread = [...new Set(input.meals.flatMap((m) => (m.recipeId && recipesById.get(m.recipeId)?.unread ? [m.recipeId] : [])))];
          for (const [n, id] of unread.entries()) {
            const saved = recipesById.get(id)!;
            yield { progress: true, done: n, total: unread.length, reading: saved.title };
            try {
              const recipe = await importRecipe(saved.sourceUrl!);
              await fetchMutation(api.recipes.save, { recipe: { ...recipe, imageUrl: recipe.imageUrl ?? saved.imageUrl } }, { token });
              recipesById.set(id, { ...saved, ...recipe, unread: undefined });
            } catch (err) {
              if (!(err instanceof ImportError)) console.error("Reading playlist recipe failed:", err);
              throw new Error(`Plan rejected: couldn't read the recipe for "${saved.title}". Pick a different dinner for that day.`);
            }
          }
          // Dinners from My Recipes get their ingredients filled in and scaled by code.
          const resolved = resolvePlan(input, recipesById, pantrySets, scaleIngredients);
          if ("error" in resolved) throw new Error(`Plan rejected: ${resolved.error}`);
          const plan = resolved.plan;
          const problem = validatePlan(plan, servings);
          if (problem) throw new Error(`Plan rejected: ${problem}`);
          if (!activeWeek || !tally) throw new Error("No budget set this week. Ask the cook to set one on the Budget page first.");
          if (!activeWeek.storeId) {
            yield { needsStore: true };
            return;
          }
          const week = activeWeek;
          const storeId = activeWeek.storeId;

          // For each ingredient to buy: Kroger's top matches, then Claude picks the right one by meaning.
          const toBuy = mergeIngredients(plan).filter((i) => !i.pantry);
          const dishFor = (name: string) =>
            plan.meals.find((m) => m.ingredients.some((i) => i.name.toLowerCase() === name.toLowerCase()))?.name ?? "";
          const storeName = week.storeName;
          const total = toBuy.length;
          let failures = 0;
          const candidates = [];
          // One Kroger search at a time (gentle on their firewall), reporting progress after each.
          for (const [n, item] of toBuy.entries()) {
            yield { progress: true, done: n, total, current: item.name, storeName };
            const options: Product[] = await searchCandidates(item.name, storeId).catch((err) => {
              failures++;
              console.error(`Kroger search failed for "${item.name}":`, err);
              return [];
            });
            candidates.push({ name: item.name, dish: dishFor(item.name), amountText: item.amountText, options });
          }
          // All lookups failing means Kroger is down, not that nothing matched: say so instead of a $0 plan.
          if (toBuy.length > 0 && failures === toBuy.length) {
            throw new Error("Couldn't reach Kroger for prices. Tell the cook to try again in a minute; don't retry now.");
          }
          yield { progress: true, done: total, total, current: undefined, storeName };
          const { products, substitutes } = await pickProducts(candidates);

          // Swaps for things Kroger doesn't carry: one more search each, still one at a time.
          for (const [name, swap] of substitutes) {
            yield { progress: true, done: total, total, current: `a swap for ${name}`, storeName };
            const found = await searchCandidates(swap, storeId).catch(() => [] as Product[]);
            const best = rankByRelevance(swap, found)[0];
            if (best) products.set(name, { ...best, substitute: swap, suggestedPacks: 1 });
          }

          yield { needsStore: false, storeName, ...pricePlan(plan, products, tally.left) };
        },
      }),
      importRecipe: tool({
        description:
          "Read a recipe from a website or YouTube link the cook pasted, save it to My Recipes, and show a Recipe Card.",
        inputSchema: z.object({ url: z.string().max(2000) }),
        execute: async ({ url }) => {
          try {
            const recipe = await importRecipe(url);
            const id = await fetchMutation(api.recipes.save, { recipe }, { token });
            recipesById.set(id, { ...recipe, _id: id, _creationTime: Date.now(), userId });
            return {
              ok: true as const,
              recipeId: id as string,
              title: recipe.title,
              sourceName: recipe.sourceName,
              sourceType: recipe.sourceType,
              imageUrl: recipe.imageUrl,
              servings: recipe.servings,
              totalMinutes: recipe.totalMinutes,
              ingredientCount: recipe.ingredients.length,
              stepCount: recipe.steps.length,
            };
          } catch (err) {
            if (!(err instanceof ImportError)) console.error("Recipe import failed:", err);
            return { ok: false as const, error: err instanceof ImportError ? err.message : "I couldn't read that recipe." };
          }
        },
      }),
      findFoodHelp: tool({
        description:
          "Show nearby free food help (food pantries, free meals, school meal sites, WIC offices) from Feed America's public directory. " +
          "Use when the cook says money is tight, they can't afford food, or asks about pantries, free meals, WIC, or kids' meals.",
        inputSchema: z.object({
          mode: z.enum(["free", "school", "summer", "wic"]).describe("free = pantries and free meals; school/summer = kids' meal sites; wic = WIC offices"),
          zip: z.string().regex(/^\d{5}$/).optional().describe("Only if the cook gave a ZIP code"),
        }),
        execute: async ({ mode, zip }) => {
          const z = zip ?? process.env.KROGER_ZIP ?? "";
          try {
            return { ok: true as const, zip: z, mode, places: await findFoodHelp(z, mode) };
          } catch (err) {
            console.error("Food help lookup failed:", err);
            return { ok: false as const, error: "Couldn't reach the food-help directory. Try again in a minute, or call or text 211." };
          }
        },
      }),
      searchRecipes: tool({
        description:
          "Search the web for recipe pages (TinyFish Search) and show a Recipe Search card; the cook taps Add to save any of them to My Recipes.",
        inputSchema: z.object({ query: z.string().min(2).max(100).describe("What to look for, e.g. 'cozy chickpea curry' or 'quick weeknight salmon'") }),
        execute: async ({ query }) => {
          try {
            const hits = await searchRecipes(query);
            const saved = new Set(savedRecipes.flatMap((r) => (r.sourceUrl ? [r.sourceUrl] : [])));
            return { ok: true as const, query, hits: hits.map((h) => ({ ...h, saved: saved.has(h.url) })) };
          } catch (err) {
            console.error("Recipe search failed:", err);
            return { ok: false as const, error: "Couldn't search the web just now. Try again in a minute." };
          }
        },
      }),
      findSales: tool({
        description:
          "Check which items are on sale at the cook's Kroger store and show a Sales card. scope: needed = this week's shopping list, " +
          "regulars = the things they buy most weeks, recipes = the ingredients their saved recipes use most.",
        inputSchema: z.object({ scope: z.enum(["needed", "regulars", "recipes"]) }),
        execute: async ({ scope }) => {
          const storeId = activeWeek?.storeId;
          const storeName = activeWeek?.storeName?.split(" · ")[0];
          if (!storeId) return { ok: false as const, error: "No Kroger store is picked yet. Ask the cook to pick one on the List page." };
          try {
            if (scope === "recipes") {
              // ponytail: the 12 most-used ingredients, one search at a time (each cached 30 minutes).
              const top = topIngredients(savedRecipes, 12);
              const sales: Sale[] = [];
              for (const ing of top) {
                const options = await searchCandidates(ing.name, storeId).catch(() => [] as Product[]);
                const sale = bestSale(ing.name, options);
                if (sale) sales.push({ ...sale, recipes: ing.recipes.slice(0, 3) });
              }
              return { ok: true as const, scope, storeName, checked: top.length, sales: sales.sort(bySaving) };
            }
            const rows =
              scope === "needed"
                ? items.flatMap((i) => (i.productId && i.paid === undefined ? [{ name: i.name, productId: i.productId }] : []))
                : (await fetchQuery(api.regulars.mine, {}, { token })).flatMap((r) => (r.productId ? [{ name: r.name, productId: r.productId }] : []));
            const found = await productsById(rows.slice(0, 50).map((r) => r.productId), storeId);
            const sales = rows.flatMap((r) => toSale(r.name, found.get(r.productId)) ?? []).sort(bySaving);
            return { ok: true as const, scope, storeName, checked: Math.min(rows.length, 50), sales };
          } catch (err) {
            console.error("Sales check failed:", err);
            return { ok: false as const, error: "Couldn't reach Kroger for sale prices. Tell the cook to try again in a minute." };
          }
        },
      }),
      suggestBudget: tool({
        description:
          "Show the cook a Budget Card with a suggested weekly grocery budget for their household, based on USDA food-cost data.",
        inputSchema: z.object({
          level: z.enum(["thrifty", "low", "moderate"]).describe("The USDA plan level that fits how they cook and shop"),
          reason: z.string().max(200).describe("One short, friendly sentence on why this level fits them"),
        }),
        execute: async ({ level, reason }) => ({
          recommended: level,
          reason,
          levels: (["thrifty", "low", "moderate"] as const).map((l) => ({
            level: l,
            label: PLAN_LABELS[l],
            amount: suggestedBudget(l, household.members ?? undefined),
          })),
        }),
      }),
    },
  });

  return createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) });
}
