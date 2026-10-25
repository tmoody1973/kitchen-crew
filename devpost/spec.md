---
doc: spec
status: approved
---

# Kitchen Crew (working name) — Technical Spec

## How This Works, In Plain Language
Kitchen Crew is a website you open on your phone or laptop. Four pieces do the work:

- **The app (Next.js on Vercel).** The screens you see — budget setup, the planner chat, the shopping list — plus a small back room on the server that holds the secret keys and talks to Claude and Kroger. Your phone never sees the keys.
- **The staff (Claude).** When you chat, your message goes to Claude with a short job description ("you're a friendly kitchen crew…"). Claude decides what to say and which **card** to show. It has a few tools it can call, like "look up Kroger prices for these ingredients." It does *not* do the budget math — plain code does that, so the numbers are always right.
- **The memory (Convex).** A hosted database — think of a spreadsheet the app reads and writes. Your budget, meal plan, shopping list, and the prices you paid live here, so the laptop and phone see the same week, and it's all still there tomorrow. When you type a price, every screen showing the tally updates by itself.
- **The front door (Clerk).** You sign in, so only you can use the app and spend your Claude credits.

**Why cards instead of an AI that invents screens:** there is a fixed set of cards (budget suggestion, meal plan, budget fit). Claude picks one and fills in the numbers. It still feels like the screen builds itself around your request, but every card is a piece of code you can point at and understand, which serves your goal of understanding the code better.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.

1. **Sign in** → Clerk checks it's you → the app asks Convex "does Tarik have a week started?" → no → you see **Budget Setup**.
2. **Budget suggestion** → plain code multiplies the USDA weekly costs for 2 adults + a 16-year-old (with USDA's 3-person adjustment) → you see the suggested number → you accept or type your own → Convex saves a new **week** (budget + today's date as the start).
3. *(Optional)* "Help me figure it out" → opens the chat; Claude asks what you like to cook and suggests a USDA plan level (thrifty / low-cost / moderate) → you accept → Convex updates the budget.
4. **Plan in chat** → you type "what should we cook?" → the app's server sends your message to Claude → Claude asks what kind of dishes, then how many days (you can paste recipe names/links).
5. **Get the plan** → Claude drafts meals with ingredient lists → calls its Kroger price tool → the server asks Kroger for each ingredient's price at your home store → code adds up meal costs and compares them to what's left in the week → you see a **Meal Plan card** and a **Budget Fit card** (fits / over by $X).
6. **Adjust** → remove a meal on the card, or ask in chat ("swap Thursday for something cheaper") → a new card comes back with updated costs.
7. **Use this plan** → tap the button → Convex saves the meals and turns their ingredients into **shopping list** rows (item · Kroger estimate · empty paid box).
8. **In the store** → open the Shopping List on your phone → type what you paid → Convex saves it → the tally at the top recalculates instantly: "$142 of $200 this week · $58 left · 4 days left" → the row turns green (paid ≤ estimate) or orange (paid more).
9. **Success** → the tally shows **under budget this week**.

## Stack
- **Next.js (App Router), TypeScript** — the app and its server routes. Recommended by Claude, accepted by Tarik; Vercel is built for it. Docs: https://nextjs.org/docs
- **Vercel AI SDK + Anthropic provider** — sends chat to Claude, streams replies, and handles Claude's tool calls that become cards. Docs: https://ai-sdk.dev/docs · https://ai-sdk.dev/providers/ai-sdk-providers/anthropic
- **Claude (Sonnet 5.5, `claude-sonnet-5-5`)** — the staff's brain. Tarik chose Claude; Sonnet picked for balance of quality and cost per chat. Docs: https://docs.claude.com
- **Convex** — database and live updates. Tarik's choice (uses it all the time); replaced the local-storage recommendation because it shares data between phone and laptop. Docs: https://docs.convex.dev
- **Clerk** — sign-in. Tarik's choice over Vercel's deployment-protection toggle; tradeoff: a sign-in step before any feature, in exchange for data that's properly his. Docs: https://clerk.com/docs · Convex + Clerk: https://docs.convex.dev/auth/clerk
- **Tailwind CSS** — styling, so `/impeccable` can apply the visual design. Docs: https://tailwindcss.com/docs
- **Vitest** — one small test file for the budget math. Docs: https://vitest.dev
- **Unverified:** exact current package versions and the Convex+Clerk setup steps. Check with `ctx7` docs at the start of the build.

## Where It Runs and How Someone Tries It
- **Locally:** `npm install`, then `npm run dev` (starts the website and Convex together). Open http://localhost:3000.
- **Keys** go in `.env.local` (git-ignored; a key-free `.env.example` is committed):
  `ANTHROPIC_API_KEY`, `KROGER_CLIENT_ID`, `KROGER_CLIENT_SECRET`, `KROGER_ZIP`, `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`. Convex also needs `CLERK_JWT_ISSUER_DOMAIN` set in its dashboard.
- **Online (chosen):** Vercel, connected to the GitHub repo, with the same keys added in Vercel's settings; Convex production deployment. Opens on Tarik's phone; sign-in protects it.
- **Demo recording:** on the laptop or phone — sign in → budget suggestion → plan 3 days in chat → use plan → enter 2–3 prices → tally shows under budget.
- **Submission:** short demo video + public GitHub repo (required). The live URL is a bonus.
- **Before going live:** a GitHub Actions check that runs typecheck, the test, and the build on every push (`6-ship` sets this up).

## Look and Feel
Carried from `prd.md > Look and Feel`.
- **Playful, Duolingo-like:** bright, confident colors; chunky rounded buttons and cards; friendly, encouraging copy ("Nice! $58 left for 4 days 🎉"); light game energy, never a sober finance app.
- **Color carries meaning:** green = paid ≤ estimate / under budget; orange = paid more / over budget; neutral = no price yet. Color is never the only signal — always paired with text.
- **Phone first:** the shopping list must be easy to use one-handed in an aisle — big tap targets, number keyboard for prices, tally always visible.
- **Process:** visual design produced with `/impeccable` during `5-build`, using Tailwind. Fonts, exact palette, mascot: left to `/impeccable`.

## Components

### Sign-in and App Shell
Clerk sign-in; every page and server route requires a signed-in user. Navigation between Budget, Plan, and List; the tally header shows on the Plan and List screens.
PRD ref: `prd.md > Screens and Layout`.

### Budget Setup Screen
First-use screen when no active week exists. Shows the suggested weekly budget (from `lib/usda.ts`) labeled "based on USDA food-cost data", an editable number, and a "help me figure it out" link to the chat. Saving creates a week in Convex.
PRD ref: `prd.md > Budget Setup`.

### USDA Budget Calculator (`lib/usda.ts`)
Plain code, no AI. Holds the USDA weekly cost per person for male 19–50, female 19–50, and male 14–18 at thrifty, low-cost, and moderate levels (constants copied from the latest report, with report month and URL in a comment), adds them, and applies USDA's 3-person household adjustment. Default suggestion: **low-cost plan** (see Decisions).
PRD ref: `prd.md > Budget Setup`.

### Planner Chat
Chat screen using the AI SDK's chat hook. Messages go to the chat route; Claude's replies can include cards. Pasted recipe names/links are just text Claude reads — nothing is fetched from YouTube.
PRD ref: `prd.md > Meal Planning Chat`.

### Chat Route and the Staff's Tools (`app/api/chat/route.ts`)
Server route: checks sign-in, sends the conversation plus the staff's job description to Claude, and offers these tools:
- `suggestBudget` — returns the USDA numbers for a chosen plan level → **Budget Card**.
- `proposeMealPlan` — Claude supplies days, meal names, and ingredient lists; the tool prices ingredients through the Kroger client, totals them in code, compares to the week's remaining budget → **Meal Plan Card** + **Budget Fit**.
The job description tells Claude to ask dish type first, then number of days.
PRD ref: `prd.md > Meal Planning Chat`.

### Cards (`components/cards/`)
The fixed set of generated-UI pieces: Budget Card (amount, plan level, Use button), Meal Plan Card (days → meals → est. cost, remove buttons, "Use this plan"), Budget Fit (fits / over by $X). The chat screen maps each tool result to its card.
PRD ref: `prd.md > Screens and Layout`, `prd.md > Meal Planning Chat`.

### Kroger Client (`lib/kroger.ts`)
Server-only. Gets an access token, lists Kroger-family stores within 10 miles of `KROGER_ZIP` (closest first) for the store picker, searches each ingredient at the chosen store, and returns the first result's price (promo if present, else regular) or "no price". Caches the token in memory until it expires.
PRD ref: `prd.md > Shopping List and Prices`.

### Shopping List Screen
Store picker at the top ("Shopping at"): the choice is saved on the week and carried into the next week; switching stores re-prices Kroger-priced and "no price found" rows (estimates Tarik typed are kept). Reads the week's list items live from Convex. Each row: item, Kroger estimate (or "no price found" with an editable estimate), and a paid box using the number keypad. Saving a price writes to Convex; the row color updates.
PRD ref: `prd.md > Shopping List and Prices`, `prd.md > Running Tally`.

### Tally Header and Budget Math (`lib/tally.ts`)
Plain code: spent = sum of paid amounts this week; left = budget − spent; days left = 7 − days since week start; status = under/over. Shown as "$142 of $200 this week · $58 left · 4 days left" with an under/over message. Covered by `lib/tally.test.ts`.
PRD ref: `prd.md > Running Tally`.

## Data Model
All in Convex, every record tagged with the signed-in user's ID.

- **weeks** — `userId`, `budget` (number), `planLevel` ("thrifty" | "low" | "moderate" | "custom"), `startDate`, `storeId` / `storeName` (the store being shopped; optional). Created at budget setup. The "active week" is the latest one less than 7 days old; after 7 days, Budget Setup appears again (`prd.md > States and Boundaries > Week boundary`).
- **meals** — `weekId`, `day`, `name`, `estimatedCost`. Written when Tarik taps "Use this plan". Replaced if he uses a new plan.
- **listItems** — `weekId`, `name`, `estimate` (price per package, or empty), `estimateSource` ("kroger" | "manual"), `productId` / `productName` / `size` (chosen Kroger product), `packs` (packages to buy), `paid` (number or empty). Slice 3–4 add `amount` / `unit` from recipes.
- **otherStores** — `userId`, `name`. Non-Kroger stores Tarik has added; the week's `otherStore` says he's shopping at one. Created from the plan's ingredients, merging identical names across meals into one row; `paid` updated in the store.

Leaving and coming back: everything is in Convex, so any device shows the same week after sign-in. The chat conversation itself is **not** saved; only the plan it produced is (see Simplified).

## File Structure

```
kitchen-crew/
├── app/
│   ├── layout.tsx              # Clerk + Convex providers, app shell, nav
│   ├── page.tsx                # routes to Budget Setup or Plan based on active week
│   ├── budget/page.tsx         # Budget Setup Screen
│   ├── plan/page.tsx           # Planner Chat (renders cards)
│   ├── list/page.tsx           # Shopping List Screen
│   └── api/
│       ├── chat/route.ts       # Chat Route: Claude + tools
│       ├── price/route.ts      # Kroger prices for item names at a store
│       └── stores/route.ts     # nearby Kroger-family stores
├── components/
│   ├── TallyHeader.tsx         # spent / left / days left, under/over
│   ├── ListRow.tsx             # item · estimate · paid box, color state
│   └── cards/
│       ├── BudgetCard.tsx
│       ├── MealPlanCard.tsx
│       └── BudgetFit.tsx
├── lib/
│   ├── usda.ts                 # USDA constants + budget calculator
│   ├── tally.ts                # budget math
│   ├── tally.test.ts           # the one test file
│   ├── kroger.ts               # Kroger token, store lookup, price search (server-only)
│   └── staff-prompt.ts         # the staff's job description
├── convex/
│   ├── schema.ts               # weeks, meals, listItems
│   ├── weeks.ts                # create/get active week, update budget
│   ├── plans.ts                # save plan → meals + list items
│   ├── listItems.ts            # list query, set paid, set manual estimate
│   └── auth.config.ts          # Clerk connection
├── middleware.ts               # Clerk: require sign-in everywhere
├── .env.example                # key names, no values
├── .github/workflows/ci.yml    # added in 6-ship
└── devpost/                    # planning docs (learner-profile.md git-ignored)
```

## External Services and Dependencies

### Kroger Public API
Docs: https://developer.kroger.com/documentation/public/getting-started/quick-start · Products API reference on developer.kroger.com.
**Verified in build (slice 2) with `scripts/kroger-probe.mjs`: token, locations, and products calls work as below (token lasts 1800 s).**
- Token: `POST https://api.kroger.com/v1/connect/oauth2/token`, body `grant_type=client_credentials&scope=product.compact`, header `Authorization: Basic base64(client_id:client_secret)` → `{ access_token, expires_in }` (~30 min).
- Store lookup: `GET https://api.kroger.com/v1/locations?filter.zipCode.near={KROGER_ZIP}&filter.limit=1` → `data[0].locationId`.
- Price search: `GET https://api.kroger.com/v1/products?filter.term={ingredient}&filter.locationId={id}&filter.limit=1` → `data[0].items[0].price.regular` / `.promo` (prices appear only when a `locationId` is given).
- Rate limits: a daily call cap on the free tier (expected thousands/day; confirm). Cost: free.

### Claude via Anthropic API
Docs: https://docs.claude.com · AI SDK: https://ai-sdk.dev/providers/ai-sdk-providers/anthropic
Called through the AI SDK with tools; key `ANTHROPIC_API_KEY`. Cost: pay per use — a planning chat is a few cents; sign-in keeps strangers out.

### USDA Food Plans: Cost of Food Reports
Index: https://www.fns.usda.gov/cnpp/usda-food-plans-cost-food-monthly-reports · latest found: low/moderate/liberal through [May 2026](https://fns-prod.azureedge.us/sites/default/files/resource-files/cnpp-costfood-3levels-may2026.pdf); Thrifty through [June 2026](https://fns-prod.azureedge.us/sites/default/files/resource-files/cnpp-costfood-june2026.pdf).
Not called at runtime: numbers are copied into `lib/usda.ts` once. **Verified in build (slice 1):** figures copied from the September 2026 reports (CostofFoodSep2026LowModLib.pdf, CostofFoodSep2026Thrifty.pdf); 3-person adjustment is +5%.

### Convex
Docs: https://docs.convex.dev · free tier covers this. Keys: `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`.

### Clerk
Docs: https://clerk.com/docs · free tier covers one user. Keys: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.

### Vercel
Docs: https://vercel.com/docs · Hobby plan, free. Same env vars set in project settings.

## Important Failure Modes
- **Kroger has no match, or the call fails** → row shows "no price found" with an editable estimate; the plan still works (`prd.md > States and Boundaries > No Kroger price`).
- **Claude is slow or errors** → the chat shows a "crew is thinking…" state, then a plain "Couldn't reach the crew — try again" message with a retry; saved data is never touched.
- **Claude returns a malformed plan** → the tool validates the shape; if invalid, the staff is told to try again once, then the user sees "Let's try that plan again."

## What Was Simplified and Why
- **Fixed cards** instead of open-ended generated UI — readable, debuggable, matches the learning goal. Fuller version: an OpenUI-style renderer letting Claude compose new components.
- **Chat history not saved** — only the resulting plan is. Fuller version: a messages table in Convex.
- **Kroger's top match is the default product**; Tarik can tap "Change brand" to pick from the top 5 (brand · size · price). The chosen product is saved and re-priced by ID when he switches stores. *(Changed in build, slice 2.)*
- **USDA numbers copied in once** instead of fetched — the reports are monthly PDFs. Fuller version: a scheduled job that reads each new report.
- **Quantities priced as whole packages** *(changed in build)*: Claude returns each ingredient with an amount and unit; code reads Kroger's package size ("1 lb", "24 ct"), converts units, adds amounts across meals, then rounds up to packages (cost to buy). Unconvertible units fall back to 1 package marked "check amount"; pantry staples are flagged "probably have it" and add $0 until needed. Rows have a pack count (×1, ×2…) Tarik can change.
- **Other stores without prices** *(added in build)*: Tarik can add non-Kroger stores (Sendik's, Whole Foods); while shopping there, rows compare what he paid against Kroger prices from the last Kroger store he picked. Price history across stores stays Later.
- **Stores limited to Kroger-family stores near the ZIP** (Pick 'n Save, Metro Market) — other chains show "no price found".

## Decisions and Open Issues

**Tarik's choices**
- Online via Vercel so it works on his phone in the store.
- Claude for the staff; all keys in hand.
- Fixed cards (recommended) over OpenUI-style.
- Convex for data (his usual tool), over local storage.
- Clerk for sign-in, over Vercel's protection toggle.
- Store picker (changed in build, slice 2): he shops several Pick 'n Save and Metro Market stores, so he picks the store per trip; switching re-prices the list. ZIP in `.env.local` sets the area.
- Household: 2 adults + 16-year-old son, for the USDA calculation.

**Derived by Claude (implementation detail)**
- Next.js, AI SDK, Tailwind, Vitest; Sonnet 5.5 as the model.
- Budget math and plan costing in plain code, never by Claude.
- **Default suggested plan level: low-cost.** *Claude-proposed, accepted by Tarik at approval* (fits "spend less than I do now"; Thrifty is the SNAP baseline and tight). Tarik can change it in the app; flagged for review.

**The useful unknown — "how does a screen 'build itself' in code?"**
Tied to Tarik's goal of understanding the code. What clarified it: Claude doesn't draw anything. It *calls a tool* (like `proposeMealPlan`) with structured data — days, meals, ingredients. The app's code receives that data and hands it to a matching card component, which draws it. So "generated UI" = Claude chooses *which* card and *what's in it*; the cards themselves are ordinary code. During the build, check it by opening `components/cards/MealPlanCard.tsx` next to a real tool result and matching each field on screen to the data.

**Open**
- Kroger endpoints and USDA figures unverified (above) — first build steps; not blocking approval.
- Project name still "Kitchen Crew (working name)".
- Exact package versions — check at build start.
