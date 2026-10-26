// Daily AI allowances, so one heavy user can't run up the Claude bill.
// Each request uses one; every allowance starts over at midnight Milwaukee time.
// The shared demo login (every judge uses it) gets a bigger allowance than a household.

export type AiKind = "chat" | "photo" | "recipe";

/** The "Demo Week" Clerk account judges sign into (same id as scripts/demo-reset.sh). */
export const DEMO_USER_ID = "user_3LCzgW9Ix3oUqX4GnOPQZ0liegw";

const DAY = 24 * 60 * 60 * 1000;
// Days start at 05:00 UTC: midnight in Milwaukee during daylight time, 11pm in winter. Without this the add-on picks a random time of day.
const MIDNIGHT_CT = 5 * 60 * 60 * 1000;

export const LIMITS = {
  chat: { kind: "fixed window", rate: 40, period: DAY, start: MIDNIGHT_CT },
  chatDemo: { kind: "fixed window", rate: 200, period: DAY, start: MIDNIGHT_CT },
  photo: { kind: "fixed window", rate: 10, period: DAY, start: MIDNIGHT_CT },
  photoDemo: { kind: "fixed window", rate: 50, period: DAY, start: MIDNIGHT_CT },
  recipe: { kind: "fixed window", rate: 30, period: DAY, start: MIDNIGHT_CT },
  recipeDemo: { kind: "fixed window", rate: 100, period: DAY, start: MIDNIGHT_CT },
} as const;

export type LimitName = keyof typeof LIMITS;

export function limitName(kind: AiKind, userId: string): LimitName {
  return userId === DEMO_USER_ID ? `${kind}Demo` : kind;
}

const WHAT: Record<AiKind, string> = { chat: "crew chats", photo: "photo reads", recipe: "recipe reads" };

/** The note shown when an allowance runs out, e.g. "You've used today's crew chats. More in about 5 hours." */
export function limitMessage(kind: AiKind, retryAfterMs: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / 60_000));
  const wait =
    minutes < 60 ? `${minutes} minute${minutes === 1 ? "" : "s"}` : `${Math.ceil(minutes / 60)} hour${minutes > 60 ? "s" : ""}`;
  return `You've used today's ${WHAT[kind]}. More in about ${wait}.`;
}
