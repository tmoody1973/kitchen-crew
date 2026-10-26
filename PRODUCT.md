# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Tarik and his partner, cooking for a family of three (two adults and a 16-year-old son) in the Milwaukee area. Both use it: planning dinners on a laptop or phone at home, and on a phone in the grocery aisle, often one-handed, checking prices and typing what they paid. They shop several Pick 'n Save and Metro Market stores, sometimes Sendik's or Whole Foods, and order from Instacart.

## Product Purpose
Keeps a family's weekly grocery spending under budget. It suggests a budget from USDA food-cost data, plans dinners in a chat with a "kitchen crew", prices every ingredient at the store they're shopping (Kroger API), turns plans into a shopping list, and keeps a live tally while they shop. Success: the tally says "under budget this week."

## Positioning
Budget tracking, meal planning, and real store prices in one conversation: the crew plans with your actual recipes and pantry, prices whole packages at your store, and the money math is plain code, never the AI. Generated UI is a fixed set of cards the crew chooses and fills.

## Operating Context
- Weekly rhythm: a 7-day week starts when the budget is set; the tally resets after that.
- In-store use on a phone: store picker, rows with Kroger estimate and a paid box, row color green (paid ≤ estimate) or orange (paid more), always paired with words.
- Planning: chat with the crew; recipe links from websites and YouTube; saved chats; plan cards with remove/swap; "Use this plan" or "Add to this week".
- Supporting lists: My Pantry (have / out), Regulars (weekly buys) with a Dinners / Extras budget split, My Recipes with a recipe view (US / Metric toggle).

## Capabilities and Constraints
- Stack: Next.js 15 (App Router), Convex, Clerk sign-in, Vercel AI SDK with Claude (Sonnet for the crew, Haiku for product picks), Tailwind 4, Kroger Public API, YouTube Data API.
- Prices only from Kroger-family stores; other stores compare against Kroger.
- Built: Kanban week board (1 or 2 weeks), YouTube playlist sync with tags and search, barcode scanning (phone camera check pending an https deploy), Instacart hand-off (development key: sandbox store), two-store price comparison, and a public landing page at `/` for signed-out visitors.
- Name decided: **Mise** (from *mise en place*, "everything in its place"), chosen by Tarik from a brainstorm; replaces the working name "Kitchen Crew". The assistant persona can stay "the crew".

## Brand Commitments
- Name: **Mise**.
- One warm, playful "crew" voice: short, encouraging, like a friendly text message. Never a sober finance app.
- Color carries meaning (under/over budget, paid vs. estimate) and is never the only signal.
- Tarik asked for the look to be "playful, Duolingo-like"; the palette is open (he wants to explore palettes).

## Evidence on Hand
- Real data: USDA Cost of Food reports, September 2026 (in `lib/usda.ts`); live Kroger prices and product photos; Tarik's own recipe links and YouTube "recipes" playlist (85 videos).
- Planning docs: `devpost/scope.md`, `devpost/prd.md`, `devpost/spec.md`.
- No testimonials, users beyond the household, or metrics exist; don't invent them.

## Product Principles
- The money is always right: totals come from code and real prices, and the tally is the source of truth.
- Fast in the aisle: the store moment (type a price, see where you stand) must work one-handed in seconds.
- Plan with what you actually cook and own: recipes, pantry, and household size drive the plan.
- Encourage, don't scold: being over budget is information with a next step, not a failure.
- Show the work: every card can be traced to visible data (prices, packs, swaps, servings).

## Accessibility & Inclusion
Color never carries meaning alone; large tap targets for one-handed phone use; status changes announced to screen readers (progress bar, tally).
