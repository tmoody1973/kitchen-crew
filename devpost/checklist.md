---
doc: checklist
status: approved
---

# Build Checklist

Build mode: learn

## Slices

- [x] **1. Sign in, get a USDA-suggested budget, and see your week's tally**
  Becomes usable: You sign in, see a suggested weekly budget for 2 adults + a 16-year-old, accept or change it, and land on a tally reading "$0 of $X this week · $X left · 7 days left." Still there after a reload, on any device.
  Why now: Bootstraps every service the rest depends on (Next.js, Tailwind, Convex, Clerk) inside a real behavior, and verifies the hand-copied USDA numbers first, because the budget is the basis of the whole tally.
  PRD ref: `prd.md > The Core Journey` (step 1), `prd.md > Budget Setup`, `prd.md > States and Boundaries` (First use, Persistence, Week boundary)
  Spec ref: `spec.md > Sign-in and App Shell`, `spec.md > Budget Setup Screen`, `spec.md > USDA Budget Calculator (lib/usda.ts)`, `spec.md > Tally Header and Budget Math (lib/tally.ts)`, `spec.md > Data Model`, `spec.md > File Structure`, `spec.md > Look and Feel`
  Build: Scaffold Next.js + TypeScript + Tailwind; add Convex (schema: weeks, meals, listItems) and Clerk (middleware, providers, `auth.config.ts`); `.env.example`. Copy USDA weekly figures from the latest report into `lib/usda.ts` (with source month/URL) and default to the low-cost level. Build `lib/tally.ts` with `lib/tally.test.ts`, the Budget Setup screen, and a Tally Header with playful base styling per Look and Feel.
  Verify (mechanical): `npx vitest run` passes (tally math: spent/left/days-left, under/over, week expiry; USDA sum + 3-person adjustment); `npx tsc --noEmit` clean; `npm run build` succeeds; `npx convex run` with a test identity creates a week and reads it back as the active week.
  Learner check: Open http://localhost:3000, sign in, and check the suggested budget and its "based on USDA food-cost data" label. Change the number, save, reload: the tally should show your number with 7 days left.
  Commit: `feat: sign-in, USDA budget setup, and weekly tally`

- [x] **2. Add an item, get its real Kroger price, type what you paid, and watch the tally move**
  Becomes usable: On the Shopping List you pick which Pick 'n Save or Metro Market you're at, add "chicken thighs," it fills in the Kroger price at that store (or "no price found" with an editable estimate), you type what you paid, the row turns green or orange, and the tally updates instantly.
  Why now: The kernel moment ("$58 left for 4 days"), plus the biggest unverified risk, the Kroger API, proven before any AI depends on it.
  PRD ref: `prd.md > Shopping List and Prices`, `prd.md > Running Tally`, `prd.md > States and Boundaries` (No Kroger price, Overspent, Empty shopping list)
  Spec ref: `spec.md > Kroger Client (lib/kroger.ts)`, `spec.md > Kroger Public API`, `spec.md > Shopping List Screen`, `spec.md > Tally Header and Budget Math (lib/tally.ts)`, `spec.md > Important Failure Modes`
  Build: First a small probe script that gets a Kroger token, finds the store from `KROGER_ZIP`, and prints the price for one item, correcting the spec if the API differs. Then `lib/kroger.ts` (token cache, nearby stores, price search) behind server routes, a store picker that re-prices the list on switch (plus non-Kroger stores compared against Kroger), a brand/size picker and pack count per row, Convex `listItems` functions, the Shopping List screen with `ListRow`, color states, and a manual add-item box (temporary until slice 4 fills the list from a plan).
  Verify (mechanical): Probe script prints a real price for a common item at the home store; tests pass and cover a paid entry updating spent/left; `npm run build` succeeds; `npx convex run` sets a paid amount and the list query returns the updated tally inputs.
  Learner check: Add "chicken thighs" and "eggs." Check that the prices look like what your store charges. Type a paid amount above one estimate and below the other: one row green, one orange, tally updated with no reload.
  Commit: `feat: Kroger-priced shopping list with live tally`

- [x] **3. Ask the crew what to cook and get a costed meal plan card**
  Becomes usable: In the Planner chat you ask "what should we cook?" The crew asks what kind of dishes (you can paste recipe names or links), then how many days, and answers with a Meal Plan card (meals, Kroger-priced costs) and a Budget Fit card ("fits" / "over by $X").
  Why now: The generated-UI half of the kernel; it builds directly on the Kroger client and tally math that slice 2 proved.
  PRD ref: `prd.md > Meal Planning Chat`, `prd.md > The Core Journey` (steps 2–3), `prd.md > Screens and Layout`
  Spec ref: `spec.md > Planner Chat`, `spec.md > Chat Route and the Staff's Tools (app/api/chat/route.ts)`, `spec.md > Cards (components/cards/)`, `spec.md > Claude via Anthropic API`, `spec.md > Important Failure Modes`
  Build: `lib/staff-prompt.ts` (one playful voice; asks dish type first, then days); chat route with sign-in check and the `proposeMealPlan` tool (Claude lists meals and ingredients with amount + unit; code fetches Kroger's top 20 per ingredient and Claude picks the right product by meaning; code prices whole packages via Kroger package sizes, totals, compares to remaining budget, validates shape); Planner chat screen mapping tool results to `MealPlanCard` and `BudgetFit`; thinking and error states.
  Verify (mechanical): `npm run build` succeeds; a scripted request to the chat route (signed-in test) returns a `proposeMealPlan` result whose totals equal the sum of its item prices; a malformed-plan unit test triggers the retry/"try again" path; tests pass.
  Learner check: Ask for 3 days of dinners and paste one recipe you like. Check that the crew asks dish type before days, that the card shows real-looking costs, and that the budget fit matches your remaining budget.
  Commit: `feat: meal planning chat with costed plan cards`

- [x] **4. Adjust the plan, use it, and shop from the list it makes**
  Becomes usable: Remove a meal on the card or ask the crew to swap one; the costs and budget fit update. Tap "Use this plan" and the Shopping List fills with the plan's ingredients (duplicates merged), each with its Kroger estimate. The optional "help me figure it out" budget chat returns a Budget Card you can use.
  Why now: Closes the core journey from plan to list to under budget, the full demo path.
  PRD ref: `prd.md > The Core Journey` (steps 4–7), `prd.md > Meal Planning Chat`, `prd.md > Budget Setup`, `prd.md > States and Boundaries` (Plan over budget)
  Spec ref: `spec.md > Cards (components/cards/)`, `spec.md > Chat Route and the Staff's Tools (app/api/chat/route.ts)`, `spec.md > Data Model`, `spec.md > Shopping List Screen`
  Build: Remove-meal on `MealPlanCard` (recompute totals in code); swap via chat; "Use this plan" Convex mutation in `convex/plans.ts` (save meals, merge ingredients into listItems by adding amounts before rounding up to packages, replace any prior plan); `suggestBudget` tool + `BudgetCard` wired to the Budget Setup "help me figure it out" link; remove the temporary manual add-item box only if the learner agrees (otherwise keep it).
  Verify (mechanical): Tests for ingredient merging and remove-meal totals pass; `npx convex run` on the plan mutation creates the expected meals and merged listItems; `npm run build` succeeds.
  Learner check: Plan 3 days, remove one meal, ask the crew to swap another, then tap "Use this plan." Open the Shopping List, enter a few paid prices, and confirm the tally ends "under budget this week."
  Commit: `feat: adjustable plans that become your shopping list`

- [ ] **5. Paste a recipe link, see the recipe, and keep it on your shelf**
  Becomes usable: Paste a recipe website or YouTube link in the planner; the crew reads the real recipe (ingredients, steps, servings, time, photo) and can put it in your plan, priced at your store. Tap a dinner to open a recipe view (photo, source badge, stats bar, ingredients rescaled with a servings stepper starting at 3, numbered steps, "Original recipe" link). Every imported or used recipe lands on a simple **My Recipes** shelf, and the crew can plan from it.
  Why now: Added by Tarik during slice 3. Built on the working plan → list journey (slice 4) so imported recipes flow straight into pricing; placed before barcode scanning at his choice.
  PRD ref: `prd.md > Meal Planning Chat` (pasted recipe names/links), `prd.md > Deferred From the POC` (YouTube, now reopened for single video links)
  Spec ref: `spec.md > Planner Chat`, `spec.md > Chat Route and the Staff's Tools (app/api/chat/route.ts)`, `spec.md > Cards (components/cards/)`, `spec.md > Data Model`
  Build: Reuse Tarik's Digero parsers (`/Users/tarikmoody/Documents/Projects/digero`): `convex/lib/parseJsonLdRecipe.ts`, `parseMicrodataRecipe.ts`, `youtubeUrlParser.ts`, the transcript fetch in `actions/youtube/fetchCaptions.ts`, and the transcript-first extraction approach from `extractRecipeFromYouTube.ts` (ported from Gemini to Claude); official YouTube Data API for title/description/thumbnail (`YOUTUBE_API_KEY`). An `importRecipe` tool in the chat; a `recipes` table (title, source, image, servings, times, ingredients, steps); meals link to recipes; recipe view and My Recipes tab with layout borrowed from Digero's recipe detail and list screens, rebuilt in Tailwind; the crew can plan from saved recipes.
  Verify (mechanical): Parser tests on saved HTML from 2 recipe sites and a YouTube link → ID cases; a scripted import of the RecipeTin Eats green curry returns 21 ingredients and 11 steps; a YouTube import returns ingredients from the transcript; servings rescale test (4 → 3); `npm run build` succeeds.
  Learner check: Paste a recipe link you like and a YouTube cooking video. Check the recipe view (ingredients, steps, servings at 3), that both land on My Recipes, and ask the crew to plan 2 days using your saved recipes.
  Commit: `feat: recipe links, recipe view, and My Recipes shelf`

- [ ] **6. Scan a barcode in the aisle**
  Becomes usable: On the Shopping List you tap Scan and point your phone at a barcode. A packaged item is added with its Kroger price at your store; a store-printed meat/deli/produce sticker fills in what you paid for that row.
  Why now: An added request (Tarik, during slice 2) that speeds up the store moment. It comes after the core journey works, and phone-camera testing needs a secure (https) address, so it goes before the design pass that styles it.
  PRD ref: `prd.md > Shopping List and Prices`, `prd.md > Running Tally`
  Spec ref: `spec.md > Shopping List Screen`, `spec.md > Kroger Client (lib/kroger.ts)`, `spec.md > Kroger Public API`
  Build: `barcode-detector` library (ZXing; covers iPhone Safari, which lacks built-in barcode reading) with the phone camera; a tested helper turning a printed UPC/EAN into a Kroger productId (drop the check digit, pad to 13) and reading the price from store-printed stickers (UPC starting with 2); scan → look up by productId at the chosen store → add row, or fill paid on a matching row; manual barcode entry fallback; local https for phone testing.
  Verify (mechanical): Tests for UPC → productId (Heinz 013000006408 → 0001300000640) and sticker price decoding pass; a scripted lookup of 3 real barcodes returns the right products; `npm run build` succeeds.
  Learner check: On your phone (secure address), scan 2 packaged items from your pantry and check the names and prices; scan a meat or deli sticker and check the paid amount it fills in.
  Commit: `feat: barcode scanning in the aisle`

- [ ] **7. Make it feel like Kitchen Crew: playful design and phone-ready list**
  Becomes usable: All screens get the playful, Duolingo-like look, with a one-handed phone layout for the Shopping List (big tap targets, number keypad, tally always visible) and friendly empty and error states.
  Why now: Design is applied once the screens exist and their behavior is settled, so `/impeccable` styles the real thing instead of guesses.
  PRD ref: `prd.md > Look and Feel`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Look and Feel`, `spec.md > Important Failure Modes`
  Build: Run `/impeccable` across Budget Setup, Planner chat and cards, and Shopping List using the Look and Feel brief; ensure color is always paired with text; phone-width layout; copy for empty list, no price, crew error.
  Verify (mechanical): `npm run build` succeeds; tests pass; `/impeccable` verification pass at phone and desktop widths with screenshots reviewed and defects fixed.
  Learner check: Open the app on your phone's browser (same Wi-Fi, laptop's local address) or a narrow window. Walk the store moment: does it feel playful, and can you enter prices one-handed?
  Commit: `feat: playful design and phone-ready shopping list`

## Hands-on Checkpoints

- [x] Early usable behavior explored — after slice 2 (real Kroger prices + live tally), before the AI chat is built on top
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: [not started]
Route and stops: [not started]
Edit outcome: [not started]
Reflection: [not started]
Activity mode: [not started]

## Revisions
- Slice 1: USDA links in the spec (May/June 2026 PDFs) now return "page not found"; the index lists a newer **September 2026** report (issued Oct 2026). Figures copied from it into `lib/usda.ts`; 3-person +5% confirmed in its footnote. Suggested low-cost budget: $222/week.
- Slice 1: `npm run dev` now starts the website and Convex together (from the official Convex + Clerk template), replacing the spec's two-terminal steps. Clerk issuer is set on Convex with `npx convex env set CLERK_JWT_ISSUER_DOMAIN …`.
- Slice 2: Kroger API verified as specced (probe: token 200, nearest store found, chicken thighs $3.99). The nearest store wasn't Tarik's, and he shops at several Pick 'n Save and Metro Market stores, so at his request the single home store became a **store picker** saved on the week; switching stores re-prices Kroger-priced rows and keeps estimates he typed. Updated `prd.md > Shopping List and Prices`, spec Kroger Client, Shopping List Screen, Data Model, Decisions.
- Slice 2 (Tarik's requests during the early checkpoint): (a) pick a brand/size from Kroger's top 5 per row, saved by product ID and re-priced as the same product on store switch; (b) a pack count per row; (c) non-Kroger stores (Sendik's, Whole Foods) in the picker, with rows compared to Kroger prices from the last Kroger store picked (Claude's default; Tarik didn't pick a yardstick). (d) Recipe quantities: Claude returns amount + unit, code rounds up to whole packages using Kroger's package size; added to slices 3–4. Price history across stores stays Later per scope.
- Slice 2: smarter product search, layer 1. Fetch Kroger's top 20, keep only the best tier (exact phrase, else all words, else all), plurals tolerated ("fish sauce" now shows 2 real fish sauces instead of tartar sauce). Layer 2, Claude choosing by meaning from the candidates (e.g., canned vs carton coconut milk), added to slice 3. Product photos added to rows and the brand picker. Verification builds now use `.next-verify` so they never break a running dev server (a build during `npm run dev` had stripped the styling).
- Added slice 5, **barcode scanning** (Tarik's request), after slice 4; design becomes slice 6. Research: Kroger looks up products by barcode (verified with 3 real UPCs); iPhone Safari lacks built-in barcode reading, so it needs the `barcode-detector` library; phone camera needs https; store-printed meat/deli stickers encode the price, not the product.
- Early hands-on checkpoint (after slice 2): Tarik tried the list (store picker, prices, brand change, packs) and his feedback shaped the build: store picker, non-Kroger stores, brand/size choice, product photos, smarter search, recipe quantities (slices 3–4), and barcode scanning (new slice 5).
- Slice 3: product picking by meaning uses **Claude Haiku 5.5** (one small call per plan, choosing from Kroger's top 10 per ingredient); the conversation stays on Sonnet 5.5. Verified with `scripts/plan-probe.mts` (real Kroger + Claude: canned coconut milk chosen over the carton; total equals the sum of items). Quantity rule added: a counted amount ("2 ct canned coconut milk") buys that many packages when the package is sized by weight/volume. Meal costs on the card are each meal's share; the shopping total is whole packages (cost to buy). Malformed-plan path: the tool rejects bad plans with a message Claude fixes (schema + `validatePlan`, unit-tested); the chat shows "Let's try that plan again…" for a failed call.
- Added slice 5, **recipe links + recipe view + My Recipes shelf** (Tarik's request), reusing parsers and UX from his Digero app; official YouTube Data API approved (key can be copied from Digero). Full recipe organizer (folders, tags, ratings, cook history, cook mode, playlists) stays Later. Barcode becomes slice 6, design slice 7.
- Slice 3: a 28-item plan made 28 simultaneous Kroger token requests; Kroger's firewall (Akamai) blocked the connection for ~10 min and every item showed $0. Fixed: one shared token request, searches one at a time (`KROGER_CONCURRENCY = 1`, ~1 s per item), an error instead of a silent $0 plan, and a live **progress bar** (tool streams progress updates). Tarik's check: 5-day comfort-food plan, 27 items, $91.99, fits budget. Quantity issues found in that run (produce counts buying whole bags/bunches, "1/2 gal" read as 2 gal, overly specific search terms) carried into slice 4.
- Slice 4: quantity fixes from Tarik's slice 3 run (Haiku suggests packs when units don't convert, so 3 carrots → 1 bag; "1/2 gal" parsed as half a gallon; plain store names in the crew prompt); 30-minute memo of Kroger searches so swaps only look up new ingredients; removed meals are sent to the crew so swaps respect them. **My Pantry** added at Tarik's request (full version: Pantry tab + pantry chips on the plan card + crew reads it). Manual "Add an item" box kept (Tarik agreed).
- Slice 4: **household meal size** added at Tarik's request: every planned meal carries `servings`, shown as "serves 3½" on the card; a Household setting on the Budget page (default 3½ = 2 adults + a teen counted as 1½; "plan leftovers for lunch" adds 1½ → 5). Plans with dinners sized below the target are sent back to the crew. Known limit: the check confirms the stated servings, not that Claude's amounts truly match (leftovers test: serves 5 but 2 lb chicken vs ~2.5 lb expected); slice 5's recipe scaling does real math for imported recipes.
- Slice 4 learner check: Tarik confirmed a 3-day plan with "serves 3½", pantry chips, remove buttons, real prices ($58.83), fits budget. Chip tap, remove/swap, Use this plan, and paid entry were approved without a screenshot of each.
