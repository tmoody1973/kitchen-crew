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

- [x] **5. Paste a recipe link, see the recipe, and keep it on your shelf**
  Becomes usable: Paste a recipe website or YouTube link in the planner; the crew reads the real recipe (ingredients, steps, servings, time, photo) and can put it in your plan, priced at your store. Tap a dinner to open a recipe view (photo, source badge, stats bar, ingredients rescaled with a servings stepper starting at 3, numbered steps, "Original recipe" link). Every imported or used recipe lands on a simple **My Recipes** shelf, and the crew can plan from it.
  Why now: Added by Tarik during slice 3. Built on the working plan → list journey (slice 4) so imported recipes flow straight into pricing; placed before barcode scanning at his choice.
  PRD ref: `prd.md > Meal Planning Chat` (pasted recipe names/links), `prd.md > Deferred From the POC` (YouTube, now reopened for single video links)
  Spec ref: `spec.md > Planner Chat`, `spec.md > Chat Route and the Staff's Tools (app/api/chat/route.ts)`, `spec.md > Cards (components/cards/)`, `spec.md > Data Model`
  Build: Reuse Tarik's Digero parsers (`/Users/tarikmoody/Documents/Projects/digero`): `convex/lib/parseJsonLdRecipe.ts`, `parseMicrodataRecipe.ts`, `youtubeUrlParser.ts`, the transcript fetch in `actions/youtube/fetchCaptions.ts`, and the transcript-first extraction approach from `extractRecipeFromYouTube.ts` (ported from Gemini to Claude); official YouTube Data API for title/description/thumbnail (`YOUTUBE_API_KEY`). An `importRecipe` tool in the chat; a `recipes` table (title, source, image, servings, times, ingredients, steps); meals link to recipes; recipe view and My Recipes tab with layout borrowed from Digero's recipe detail and list screens, rebuilt in Tailwind; the crew can plan from saved recipes.
  Verify (mechanical): Parser tests on saved HTML from 2 recipe sites and a YouTube link → ID cases; a scripted import of the RecipeTin Eats green curry returns 21 ingredients and 11 steps; a YouTube import returns ingredients from the transcript; servings rescale test (4 → 3); `npm run build` succeeds.
  Learner check: Paste a recipe link you like and a YouTube cooking video. Check the recipe view (ingredients, steps, servings at 3), that both land on My Recipes, and ask the crew to plan 2 days using your saved recipes.
  Commit: `feat: recipe links, recipe view, and My Recipes shelf`

- [x] **6. Budget for the extras: Regulars and a Dinners/Extras split**
  Becomes usable: A Regulars list of things bought most weeks (sparkling water ×2, bananas, chips, a 12-pack), each priced at the chosen store, added to the shopping list with one tap or automatically each new week. The weekly budget splits into Dinners and Extras (Tarik sets it, or the app suggests one from the Regulars total). The tally shows both ("Dinners $98 of $160 · Extras $41 of $62"), the crew plans dinners against the Dinners share, and list rows are labeled 🍽 dinner / 🛒 extra.
  Why now: Makes "under budget this week" honest by counting snacks, fruit, and drinks, which are real grocery spend; Tarik ranked it first among the added ideas.
  PRD ref: `prd.md > Running Tally`, `prd.md > Shopping List and Prices`, `prd.md > Budget Setup`
  Spec ref: `spec.md > Tally Header and Budget Math (lib/tally.ts)`, `spec.md > Shopping List Screen`, `spec.md > Data Model`, `spec.md > Chat Route and the Staff's Tools (app/api/chat/route.ts)`
  Build: `regulars` table (name, packs, product) priced via the Kroger client; a Regulars screen; "Add regulars" on the List plus an auto-add option for new weeks; `category` ("dinner" | "extra") on list items (plan items = dinner, regulars and manual adds = extra, changeable per row); `extrasBudget` on the week with a suggested split; tally math per category (tested); the chat route passes the Dinners remaining to the crew and the Budget Fit card.
  Verify (mechanical): Tests for the split tally (dinner and extra spent/left, overall under/over); `npx convex run` adds regulars to a week's list once (no duplicates) and auto-adds on a new week; `npm run build` succeeds.
  Learner check: Add 4 regulars, set the split, tap Add regulars, pay for one dinner item and one extra, and check both halves of the tally; plan a meal and check the Budget Fit uses the Dinners share.
  Commit: `feat: regulars and a dinners/extras budget split`

- [x] **7. Make it feel like Kitchen Crew: playful design and phone-ready list**
  Becomes usable: All screens get the playful, Duolingo-like look, with a one-handed phone layout for the Shopping List (big tap targets, number keypad, tally always visible) and friendly empty and error states.
  Why now: Design is applied once the screens exist and their behavior is settled, so `/impeccable` styles the real thing instead of guesses.
  PRD ref: `prd.md > Look and Feel`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Look and Feel`, `spec.md > Important Failure Modes`
  Build: Run `/impeccable` across Budget Setup, Planner chat and cards, and Shopping List using the Look and Feel brief; ensure color is always paired with text; phone-width layout; copy for empty list, no price, crew error.
  Verify (mechanical): `npm run build` succeeds; tests pass; `/impeccable` verification pass at phone and desktop widths with screenshots reviewed and defects fixed.
  Learner check: Open the app on your phone's browser (same Wi-Fi, laptop's local address) or a narrow window. Walk the store moment: does it feel playful, and can you enter prices one-handed?
  Commit: `feat: playful design and phone-ready shopping list`

- [x] **8. Plan the week on a Kanban board**
  Becomes usable: A **Kanban-style board** (Tarik's request): days are columns, dinners are cards, plus an **Ideas** column for unscheduled dinners from chats or My Recipes; drag cards between days (or use a "Move to…" menu on phones); a **1 week / 2 weeks** toggle; with two weeks, each week keeps its own budget and tally ("This week $142 of $222 · Next week $38 of $222"); plans from any chat are added to open days or chosen days; dinners can be moved between days or removed; the shopping list is rebuilt from every dinner on the calendar (paid and hand-added items always stay); the tally covers the whole calendar.
  Why now: Requested by Tarik after saved chats made multiple plans possible; "Add to this week" (slice 5) covers combining plans until this lands.
  PRD ref: `prd.md > Meal Planning Chat`, `prd.md > Possible Later Enhancements` (week calendar)
  Spec ref: `spec.md > Data Model`, `spec.md > Cards (components/cards/)`, `spec.md > Shopping List Screen`
  Build: meals store a day index (or "ideas") and their own scaled ingredients and chosen products; a board screen with drag-and-drop (dnd-kit) and a Move-to menu (layout reference: Digero's meal-planner calendar); only scheduled dinners count toward the list and tally; "Add to calendar" from plan cards; list regeneration from calendar meals, preserving paid and manual rows.
  Verify (mechanical): Tests for rebuilding the list from calendar meals (add, move, remove; paid rows kept); `npm run build` succeeds.
  Learner check: Add dinners from two different chats to different days, move one, remove one, and check the shopping list and tally follow.
  Commit: `feat: week calendar for dinners`

- [ ] **9. Sync your YouTube recipe playlist into My Recipes, tagged and searchable**
  Becomes usable: Tap "Sync my playlist" on My Recipes and all videos from Tarik's "recipes" playlist (85 at the time of writing) appear on the shelf with thumbnails and a "not read yet" tag; syncing again adds new videos only. A video's recipe is read the first time it's opened or planned. The crew can plan from the playlist ("plan 3 days from my YouTube playlist").
  Why now: Added by Tarik after slice 5; it builds directly on slice 5's YouTube import and recipe shelf. Reopens the PRD's deferred playlist import at his request.
  PRD ref: `prd.md > Deferred From the POC` (YouTube playlist import, now reopened), `prd.md > Meal Planning Chat`
  Spec ref: `spec.md > Planner Chat`, `spec.md > Chat Route and the Staff's Tools (app/api/chat/route.ts)`, `spec.md > Data Model`
  Build: YouTube Data API playlistItems (50 per page) → recipes saved as "not read yet" (title, thumbnail, video link, channel). Reading order per video: (1) a recipe link in the description (skip sponsor/shop links; accept only pages with real recipe data) read by the website parser; (2) if the site blocks plain fetching or has no recipe data, TinyFish renders the page and Claude extracts the recipe (`TINYFISH_API_KEY`); (3) otherwise description + transcript via Claude (slice 5 path). Read on open (recipe view) and when the crew plans with an unread recipe (progress bar). Playlist titles passed to the crew for planning.
  Verify (mechanical): Sync returns all playlist videos and a second sync adds none; tests for description-link filtering; real reads of 3 playlist videos covering link-to-site, description-only, and TinyFish fallback; `npm run build` succeeds.
  Learner check: Tap Sync, check the shelf fills with your playlist; open 2 videos and check their recipes; ask the crew to plan 2 days from your playlist.
  Also: **auto-tags** (cuisine, main protein, meal type, time, traits like spicy/one-pan/vegetarian) assigned by Claude as recipes arrive (whole playlist tagged in one call at sync); Tarik can add/remove his own tags; a **search box** over titles, ingredients, and tags (Convex text search) plus **tag filter chips** on My Recipes; the crew answers mood-based requests ("something cozy") from the shelf. Vector search and folders stay Later.
  Commit: `feat: YouTube playlist synced into My Recipes, tagged and searchable`

- [ ] **10. Scan a barcode in the aisle**
  Becomes usable: On the Shopping List you tap Scan and point your phone at a barcode. A packaged item is added with its Kroger price at your store; a store-printed meat/deli/produce sticker fills in what you paid for that row.
  Why now: An added request (Tarik, during slice 2) that speeds up the store moment. It comes after the core journey works, and phone-camera testing needs a secure (https) address, so it goes before the design pass that styles it.
  PRD ref: `prd.md > Shopping List and Prices`, `prd.md > Running Tally`
  Spec ref: `spec.md > Shopping List Screen`, `spec.md > Kroger Client (lib/kroger.ts)`, `spec.md > Kroger Public API`
  Build: `barcode-detector` library (ZXing; covers iPhone Safari, which lacks built-in barcode reading) with the phone camera; a tested helper turning a printed UPC/EAN into a Kroger productId (drop the check digit, pad to 13) and reading the price from store-printed stickers (UPC starting with 2); scan → look up by productId at the chosen store → add row, or fill paid on a matching row; manual barcode entry fallback; local https for phone testing.
  Verify (mechanical): Tests for UPC → productId (Heinz 013000006408 → 0001300000640) and sticker price decoding pass; a scripted lookup of 3 real barcodes returns the right products; `npm run build` succeeds.
  Learner check: On your phone (secure address), scan 2 packaged items from your pantry and check the names and prices; scan a meat or deli sticker and check the paid amount it fills in.
  Commit: `feat: barcode scanning in the aisle`

- [ ] **11. Send your list to Instacart**
  Becomes usable: A "Send to Instacart" button on the Shopping List (and on a recipe) opens Instacart with the items pre-filled, so Tarik can pick a store and check out for delivery; the tally still tracks what he spends when he types the Instacart prices into the paid boxes.
  Why now: Tarik orders groceries from Instacart often; he asked for it as the final slice, after everything else is built. Reopens scope's "Later: Instacart integration" at his request.
  PRD ref: `prd.md > Deferred From the POC` (Instacart, now reopened), `prd.md > Shopping List and Prices`
  Spec ref: `spec.md > Shopping List Screen`, `spec.md > External Services and Dependencies`
  Build: Instacart Developer Platform (`INSTACART_API_KEY`, already in `.env.local`); reference Tarik's Digero implementation (`digero/convex/actions/sendToInstacart.ts`, `sendRecipeToInstacart.ts`, `convex/lib/instacartUtils.ts`); verify current API docs before building; a server route that turns list items (name, amount/packs) into an Instacart shopping-list link.
  Verify (mechanical): A scripted request with 3 real list items returns a working Instacart link; `npm run build` succeeds.
  Learner check: Tap Send to Instacart from a real list, check the items arrive in Instacart correctly, and (optionally) place an order.
  Commit: `feat: send shopping list to Instacart`

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
- Slice 5: built from Digero's parsers (JSON-LD, microdata, YouTube URL parser) and transcript fetcher, with Claude replacing Gemini. YouTube transcripts come from the public video page (the official API needs Google sign-in for captions); title/description/thumbnail from the official API. Imported recipes keep original servings; scaling is code (whole items round up, pinches don't scale). Dinners from My Recipes are planned by recipe id and filled in by code. The crew's own dinners get short steps and are saved as recipes on "Use this plan". **Bug found and fixed:** the product picker matched Claude's answers by ingredient name, so reworded names silently became "no price found" (also affected slices 3–4); it now matches by item number (real RecipeTin curry: $0 → 11/16 items priced, $25.41). Link fetching refuses private/local addresses.
- Added slice 6, **YouTube playlist sync** (Tarik's request; playlist "recipes", 85 videos). Read on demand rather than all at once (~13 s and a few cents per video). TinyFish approved as the fallback for sites that resist plain fetching (4 of 4 playlist recipe sites tested worked without it). Barcode becomes slice 7, design slice 8.
- Slice 6 scope adds auto-tags, quick search, tag filter chips, and "ask the crew" from the shelf (Tarik's request). True vector search needs an embeddings provider (Anthropic has none), so it stays Later. Slice 5 also gained metric → American display ("397 g (14 oz)", "583 g (2½ cups)", "to taste") from Tarik's screenshot.
- Slice 5 (from Tarik's green-beans check): recipe ingredients now carry `fixed` (frying oil, pasta water: not scaled) and `madeInRecipe` ("garlic oil (from above)": not bought); stricter pantry definition (salt, pepper, water, plain oil, common dried spices only). **Substitutes** added at Tarik's request: when nothing at Kroger is the ingredient, Claude suggests an everyday swap and the app prices it (zha cai → kimchi, mushroom bouillon → vegetable bouillon), shown as "swap:" on the card. The 2.5× amounts he saw came from his Household "leftovers" setting (5 servings) on a 2-serving recipe, which is correct math. Known rough edges: oil used to make an in-recipe component may still scale; Claude's pack judgment can undercount (20 cloves → 1 bulb).
- Slice 5: **saved chats** (Tarik chose option A): conversations save to Convex after each reply, including dinners removed on plan cards; Plan reopens the most recent chat; "+ New chat" and a Chats list. Not verified end to end: the ~900 KB chat size limit (the command line can't send a payload that large). Full doc pass: `prd.md` and `spec.md` now describe everything added in the build (marked "added in build, slice N"), with the real file structure and data model.
- Slice 5: **"Add to this week"** (Tarik chose option A): a second button that adds a plan's dinners without replacing the current plan; matching unpaid rows get more packs, paid rows are left alone, no duplicates. A week calendar was requested and is planned as its own slice; a Regulars + extras budget (snacks, fruit, drinks) was proposed, awaiting Tarik's prioritization.
- Re-ordered remaining slices at Tarik's go-ahead ("do what you recommend"): 6 Regulars + Dinners/Extras budget (new), 7 design pass, 8 week calendar (new), 9 playlist sync with tags and search, 10 barcode scanning. Submission deadline: Tarik said not to worry about it for now.
- Added slice 11, **Instacart integration** (Tarik's request, final slice): reuses Digero's Instacart code and the existing `INSTACART_API_KEY`.
- Slice 5: recipe view shows kitchen fractions ("3¾ cups", "⅔ tsp") and labels for ingredients that don't scale (🔒) or are made in an earlier step (not bought). Slice 8 calendar gains a 1-week / 2-week toggle (Tarik's request), each week with its own budget.
- Slice 5: replaced "metric with American in parentheses" by a **US | Metric toggle** on the recipe view (Tarik wanted to see either system; the green-beans recipe was US-native so nothing converted before).
- Slice 8 becomes a **Kanban board** (Tarik's idea): day columns, dinner cards, an Ideas column, drag-and-drop with a phone-friendly Move-to menu.
- Slice 5 learner check: Tarik confirmed it worked (recipe links, recipe view, saved chats, Add to this week).
- Slice 6: built Regulars (Pantry page), Add regulars + auto-add for new weeks, Dinners/Extras split (Budget page) with suggestion, two-line tally, 🍽/🛒 row labels, crew plans against the Dinners share. Moved shared Convex helpers into `convex/model.ts` after a circular import (weeks ↔ regulars ↔ listItems) broke the Convex upload. Not verified: auto-add when a real new week starts (needs a week to end). Trips (one weekly list split by store) still awaiting Tarik's decision.
- Slice 6: regulars stay connected to Kroger (Tarik asked): "Add regulars" refreshes each price at the current store by product ID; regulars get "Change brand" / "Find at Kroger".
- Slice 6 learner check: Tarik confirmed ("looks good"). Trips (one weekly list split by store) not built — no decision; listed as a possible later enhancement.
- Slice 7: product renamed **Mise** (Tarik's pick from a name brainstorm). `PRODUCT.md` created for the `/impeccable` design pass (users: Tarik and his partner).
- Slice 7: `/impeccable` design pass — Market Stall direction (assigned by the concept roll, chosen by Tarik over the "Cutting Board" pick). Built with self-hosted Bowlby One + Figtree, lucide icons, chalkboard tally with flipping cells, shelf tags, press buttons, stamps, sign headings, ruled sections. Verified with real phone-viewport captures (Playwright Chrome emulation, 390×844) after the first stand-in captures were rejected as invalid. Independent finish reviewer: fix → fix → ship over three rounds (user funded the third). Documenter wrote `DESIGN.md` + `.impeccable/design.json` and caught legend/contrast drift, fixed before commit (tomato #e5402b → #d33722 for 4.5:1 with white). Open (minor): empty-List first-use guidance verified in code only.
- Slice 7 learner check: Tarik confirmed ("feels good").
- Slice 8 built (option A, Tarik): date-aware weeks (next week can exist ahead and takes over on its first day), dinners store ingredients + products, `rebuildWeek` re-prices scheduled dinners and only manages `fromBoard` rows (paid, hand-added, and pre-board rows untouched — avoids deleting the existing list), Kanban board with dnd-kit + Move-to menu, 1/2-week toggle, List week switch. Verified: 58 tests (week math, board pricing), Convex flow test (place, move to next week creates it with $222, lists split correctly, paid row kept, Ideas cost nothing), phone/desktop captures (fixed nav overflow at 390px and a centered-overflow bug that hid the first columns). Phone redesign after Tarik's review ("janky on mobile", two reference apps): one column per screen with a day strip, photo cards, "···" bottom-sheet menu, drag desktop-only. Bug found on the way: hidden screen-reader labels in the day strip escaped its scroll box and stretched the phone page to 792px, which pushed the bottom sheet off-screen; fixed by anchoring them inside their buttons (verified: page width back to 390, sheet at the screen bottom). Pre-board dinners appear in Ideas (no day, no saved ingredients). Done as an extension of the Market Stall world (no new concept round).
