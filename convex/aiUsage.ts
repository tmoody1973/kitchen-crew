// Daily AI allowances per person (rules in lib/ai-limits.ts). The server routes call `take`
// before each Claude call; a "no" means the route answers with the limit note instead.
import { RateLimiter } from "@convex-dev/rate-limiter";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { mutation } from "./_generated/server";
import { requireUserId } from "./model";
import { LIMITS, limitName } from "../lib/ai-limits";

const rateLimiter = new RateLimiter(components.rateLimiter, LIMITS);

export const take = mutation({
  args: { kind: v.union(v.literal("chat"), v.literal("photo"), v.literal("recipe")) },
  handler: async (ctx, { kind }) => {
    const userId = await requireUserId(ctx);
    const { ok, retryAfter } = await rateLimiter.limit(ctx, limitName(kind, userId), { key: userId });
    return { ok, retryAfter: retryAfter ?? 0 };
  },
});
