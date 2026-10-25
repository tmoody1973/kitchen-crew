import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
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
import { searchCandidates, Product } from "@/lib/kroger";
import { mergeIngredients, planSchema, pricePlan, validatePlan, PlanToolOutput } from "@/lib/meal-plan";
import { pickProducts } from "@/lib/pick-products";
import { staffPrompt } from "@/lib/staff-prompt";
import { computeTally, isWeekActive } from "@/lib/tally";
import { PLAN_LABELS, suggestedBudget } from "@/lib/usda";
import { targetServings } from "@/lib/household";
import { z } from "zod";

export const maxDuration = 60;

/** A sign-in pass Convex accepts, the same way the browser gets one. */
async function convexToken(): Promise<string | null> {
  const { getToken, sessionClaims } = await auth();
  return sessionClaims?.aud === "convex" ? getToken() : getToken({ template: "convex" });
}

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
  // Dinners Tarik removed on the latest plan card, so a later "swap Thursday" works from his edited plan.
  const removed = Array.isArray(removedMeals)
    ? removedMeals.filter((m): m is string => typeof m === "string").map((m) => m.slice(0, 100)).slice(0, 14)
    : [];

  // What's left this week, from Convex, so Claude and the Budget Fit card see real numbers.
  const token = (await convexToken()) ?? undefined;
  const [week, items, pantry, household] = await Promise.all([
    fetchQuery(api.weeks.latest, {}, { token }),
    fetchQuery(api.listItems.mine, {}, { token }),
    fetchQuery(api.pantry.mine, {}, { token }),
    fetchQuery(api.household.mine, {}, { token }),
  ]);
  const servings = targetServings(household);
  // No active week is fine for budget help; meal plans need one.
  const activeWeek = week && isWeekActive(week.startDate, Date.now()) ? week : null;
  const tally = activeWeek
    ? computeTally(activeWeek.budget, items.map((i) => i.paid), activeWeek.startDate, Date.now())
    : null;

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
    }),
    messages: await convertToModelMessages(messages),
    stopWhen: isStepCount(4), // plan → (retry once) → closing line
    tools: {
      proposeMealPlan: tool({
        description:
          "Show Tarik a costed meal plan card. Call only after you know the kind of dishes and the number of days.",
        inputSchema: planSchema,
        // A generator: each `yield` before the last is a progress update for the chat's progress bar.
        execute: async function* (plan): AsyncGenerator<PlanToolOutput> {
          const problem = validatePlan(plan, servings);
          if (problem) throw new Error(`Plan rejected: ${problem}`);
          if (!activeWeek || !tally) throw new Error("No budget set this week. Ask Tarik to set one on the Budget page first.");
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
            throw new Error("Couldn't reach Kroger for prices. Tell Tarik to try again in a minute; don't retry now.");
          }
          yield { progress: true, done: total, total, current: undefined, storeName };
          const products = await pickProducts(candidates);

          yield { needsStore: false, storeName, ...pricePlan(plan, products, tally.left) };
        },
      }),
      suggestBudget: tool({
        description:
          "Show Tarik a Budget Card with a suggested weekly grocery budget for his household, based on USDA food-cost data.",
        inputSchema: z.object({
          level: z.enum(["thrifty", "low", "moderate"]).describe("The USDA plan level that fits how he cooks and shops"),
          reason: z.string().max(200).describe("One short, friendly sentence on why this level fits him"),
        }),
        execute: async ({ level, reason }) => ({
          recommended: level,
          reason,
          levels: (["thrifty", "low", "moderate"] as const).map((l) => ({
            level: l,
            label: PLAN_LABELS[l],
            amount: suggestedBudget(l),
          })),
        }),
      }),
    },
  });

  return createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) });
}
