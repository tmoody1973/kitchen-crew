import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  weeks: defineTable({
    userId: v.string(),
    budget: v.number(),
    planLevel: v.union(v.literal("thrifty"), v.literal("low"), v.literal("moderate"), v.literal("custom")),
    startDate: v.number(),
  }).index("by_user", ["userId"]),

  meals: defineTable({
    weekId: v.id("weeks"),
    day: v.string(),
    name: v.string(),
    estimatedCost: v.number(),
  }).index("by_week", ["weekId"]),

  listItems: defineTable({
    weekId: v.id("weeks"),
    name: v.string(),
    estimate: v.optional(v.number()),
    estimateSource: v.union(v.literal("kroger"), v.literal("manual")),
    paid: v.optional(v.number()),
  }).index("by_week", ["weekId"]),
});
