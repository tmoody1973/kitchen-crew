import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  weeks: defineTable({
    userId: v.string(),
    budget: v.number(),
    planLevel: v.union(v.literal("thrifty"), v.literal("low"), v.literal("moderate"), v.literal("custom")),
    startDate: v.number(),
    storeId: v.optional(v.string()),
    storeName: v.optional(v.string()),
    // Set while shopping at a non-Kroger store; prices still come from storeId (the last Kroger store).
    otherStore: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  // Non-Kroger stores Tarik has added (Sendik's, Whole Foods…), kept across weeks.
  otherStores: defineTable({
    userId: v.string(),
    name: v.string(),
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
    // The exact Kroger product chosen (brand + package), so re-pricing finds the same one.
    productId: v.optional(v.string()),
    productName: v.optional(v.string()),
    size: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    packs: v.optional(v.number()), // packages to buy; missing = 1
    paid: v.optional(v.number()),
  }).index("by_week", ["weekId"]),
});
