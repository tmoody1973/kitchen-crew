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

export const maxDuration = 60;

/** A sign-in pass Convex accepts, the same way the browser gets one. */
async function convexToken(): Promise<string | null> {
  const { getToken, sessionClaims } = await auth();
  return sessionClaims?.aud === "convex" ? getToken() : getToken({ template: "convex" });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { messages } = (await req.json().catch(() => ({}))) as { messages?: UIMessage[] };
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 60) {
    return Response.json({ error: "Send 1–60 messages" }, { status: 400 });
  }

  // What's left this week, from Convex, so Claude and the Budget Fit card see real numbers.
  const token = (await convexToken()) ?? undefined;
  const [week, items] = await Promise.all([
    fetchQuery(api.weeks.latest, {}, { token }),
    fetchQuery(api.listItems.mine, {}, { token }),
  ]);
  if (!week || !isWeekActive(week.startDate, Date.now())) {
    return Response.json({ error: "Set this week's budget first" }, { status: 409 });
  }
  const tally = computeTally(week.budget, items.map((i) => i.paid), week.startDate, Date.now());

  const result = streamText({
    model: anthropic("claude-sonnet-5-5"),
    instructions: staffPrompt({ remaining: tally.left, daysLeft: tally.daysLeft, storeName: week.storeName }),
    messages: await convertToModelMessages(messages),
    stopWhen: isStepCount(4), // plan → (retry once) → closing line
    tools: {
      proposeMealPlan: tool({
        description:
          "Show Tarik a costed meal plan card. Call only after you know the kind of dishes and the number of days.",
        inputSchema: planSchema,
        // A generator: each `yield` before the last is a progress update for the chat's progress bar.
        execute: async function* (plan): AsyncGenerator<PlanToolOutput> {
          const problem = validatePlan(plan);
          if (problem) throw new Error(`Plan rejected: ${problem}`);
          if (!week.storeId) {
            yield { needsStore: true };
            return;
          }

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
            const options: Product[] = await searchCandidates(item.name, week.storeId).catch((err) => {
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
    },
  });

  return createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) });
}
