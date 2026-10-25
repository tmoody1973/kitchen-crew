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
    extrasBudget: v.optional(v.number()), // the Extras share of the budget (snacks, drinks, fruit…)
  }).index("by_user", ["userId"]),

  // How to size meals: servings per dinner (teen counts as 1.5) and whether to plan lunch leftovers.
  household: defineTable({
    userId: v.string(),
    servings: v.number(),
    leftovers: v.boolean(),
    autoRegulars: v.optional(v.boolean()), // add regulars to each new week's list automatically
  }).index("by_user", ["userId"]),

  // Things bought most weeks (sparkling water, bananas, chips…), priced at the chosen store.
  regulars: defineTable({
    userId: v.string(),
    name: v.string(),
    packs: v.number(),
    estimate: v.optional(v.number()),
    productId: v.optional(v.string()),
    productName: v.optional(v.string()),
    size: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  // Planner conversations, saved like Claude chats so you can leave and come back.
  chats: defineTable({
    userId: v.string(),
    title: v.string(),
    updatedAt: v.number(),
    messagesJson: v.string(), // the AI SDK messages, including plan cards' tool results
    removedJson: v.string(), // dinners removed on each plan card, by tool call id
  }).index("by_user_updated", ["userId", "updatedAt"]),

  // What's in Tarik's pantry, remembered across weeks. have=false means "out, need to buy".
  pantry: defineTable({
    userId: v.string(),
    name: v.string(), // lowercase, trimmed
    have: v.boolean(),
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
    servings: v.optional(v.number()),
    recipeId: v.optional(v.id("recipes")),
  }).index("by_week", ["weekId"]),

  // My Recipes: imported from a link, or the crew's own dinners saved when a plan is used.
  recipes: defineTable({
    userId: v.string(),
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
  }).index("by_user", ["userId"]),

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
    fromPlan: v.optional(v.boolean()), // added by "Use this plan"; replaced when a new plan is used
    category: v.optional(v.union(v.literal("dinner"), v.literal("extra"))), // missing → plan items dinner, others extra
  }).index("by_week", ["weekId"]),
});
