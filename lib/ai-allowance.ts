import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { convexToken } from "@/lib/convex-token";
import { limitMessage, type AiKind } from "@/lib/ai-limits";

/** Uses one of today's AI allowance. Returns the note to show when it's used up, or null to go ahead. */
export async function spendAllowance(kind: AiKind, token?: string): Promise<string | null> {
  const pass = token ?? (await convexToken()) ?? undefined;
  const { ok, retryAfter } = await fetchMutation(api.aiUsage.take, { kind }, { token: pass });
  return ok ? null : limitMessage(kind, retryAfter);
}
