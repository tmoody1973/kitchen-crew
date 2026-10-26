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

*Added in the build:*
- **Recipe link** → pasted in chat → the server reads the page's built-in recipe data (or, for YouTube, the video's description and spoken transcript) → Claude Haiku cleans up ingredient lines → Convex saves it to **recipes** → a **Recipe Card** appears. When it's planned, code fills in its ingredients scaled to the household's servings.
- **Pricing** → each ingredient searched at Kroger one at a time (progress bar) → Claude Haiku picks the right product by meaning (or names a substitute to search) → code prices whole packages.
- **Saved chats** → after each reply the conversation is saved to Convex **chats**; opening Plan reloads the most recent one.

## Stack
- **Next.js (App Router), TypeScript** — the app and its server routes. Recommended by Claude, accepted by Tarik; Vercel is built for it. Docs: https://nextjs.org/docs
- **Vercel AI SDK + Anthropic provider** — sends chat to Claude, streams replies, and handles Claude's tool calls that become cards. Docs: https://ai-sdk.dev/docs · https://ai-sdk.dev/providers/ai-sdk-providers/anthropic
- **Claude (Sonnet 5.5, `claude-sonnet-5-5`)** — the staff's brain; **Haiku 5.5** (`claude-haiku-5-5`) picks the right Kroger product per ingredient (added in build, slice 3). Tarik chose Claude; Sonnet picked for balance of quality and cost per chat. Docs: https://docs.claude.com
- **Convex** — database and live updates. Tarik's choice (uses it all the time); replaced the local-storage recommendation because it shares data between phone and laptop. Docs: https://docs.convex.dev
- **Clerk** — sign-in. Tarik's choice over Vercel's deployment-protection toggle; tradeoff: a sign-in step before any feature, in exchange for data that's properly his. Docs: https://clerk.com/docs · Convex + Clerk: https://docs.convex.dev/auth/clerk
- **Tailwind CSS** — styling, so `/impeccable` can apply the visual design. Docs: https://tailwindcss.com/docs
- **Vitest** — unit tests for the money, quantity, recipe, and pricing logic (grew from one file to seven during the build). Docs: https://vitest.dev
- **Versions in use (verified in build):** Next.js 15.5, React 19, Convex 1.48, Clerk 7, AI SDK 7 with `@ai-sdk/anthropic` 4, Zod 4, Tailwind 4, TypeScript 5 (pinned; Next 15 doesn't support TypeScript 7). Started from the official Convex + Clerk + Next.js template.
- **Reused code:** recipe parsers and the YouTube transcript approach from Tarik's own app, Digero (`lib/recipes/`, each file credited).

## Where It Runs and How Someone Tries It
- **Locally:** `npm install`, then `npm run dev` (starts the website and Convex together). Open http://localhost:3000.
- **Keys** go in `.env.local` (git-ignored; a key-free `.env.example` is committed):
  `ANTHROPIC_API_KEY`, `KROGER_CLIENT_ID`, `KROGER_CLIENT_SECRET`, `KROGER_ZIP`, `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `YOUTUBE_API_KEY` (added in build, slice 5), `TINYFISH_API_KEY` (planned, slice 6). Convex also needs `CLERK_JWT_ISSUER_DOMAIN`, set with `npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<app>.clerk.accounts.dev`.
- **Online (chosen):** Vercel, connected to the GitHub repo, with the same keys added in Vercel's settings; Convex production deployment. Opens on Tarik's phone; sign-in protects it. *Built (6-ship prep):* live at **https://mise-weld.vercel.app** (Vercel project `mise`, `vercel.json` declares Next.js, `.vercelignore` keeps secrets and local tooling out of uploads), using the Convex **dev** deployment and the Clerk **dev** instance so the demo account's sample week is available to judges; a "Demo Week" login is given to judges privately (Devpost testing instructions), and a new browser is asked for Clerk's test code 424242. CI (`.github/workflows/ci.yml`) runs typecheck, tests, and build on every push and pull request; proven to fail on a broken test.
- **Demo recording:** on the laptop or phone — sign in → budget suggestion → plan 3 days in chat → use plan → enter 2–3 prices → tally shows under budget.
- **Submission:** short demo video + public GitHub repo (required). The live URL is a bonus.
- **Before going live:** a GitHub Actions check that runs typecheck, the test, and the build on every push (`6-ship` sets this up).

## Look and Feel
Carried from `prd.md > Look and Feel`.
- **Playful, Duolingo-like:** bright, confident colors; chunky rounded buttons and cards; friendly, encouraging copy ("Nice! $58 left for 4 days 🎉"); light game energy, never a sober finance app.
- **Color carries meaning:** green = paid ≤ estimate / under budget; orange = paid more / over budget; neutral = no price yet. Color is never the only signal — always paired with text.
- **Phone first:** the shopping list must be easy to use one-handed in an aisle — big tap targets, number keyboard for prices, tally always visible.
- **Laptop layouts** *(after final review, Tarik: "not too much scrolling on the laptop")*: from 1024 px the content widens to ~1150 px (nav labels beside icons) and pages use the width; phones are unchanged (all changes are `lg:` classes). List: pinned left sidebar (tally, store, compare, scan, regulars, Instacart, add) + compact rows (item · packs · price · paid; the slim pinned tally is hidden since the sidebar stays visible). My Recipes: pinned sidebar (this week, sync, search, wrapped tag chips) + photo grid (3 across, 4 from 1280 px). Recipe view: details · ingredients · steps in three columns from 1280 px (two below). Plan: chat + pinned rail with the tally and this week's dinners (`components/WeekRail.tsx`). Pantry/Regulars and Budget/Household side by side. Measured at 1440×900: List 5.9 → 3.6 screens, My Recipes 9.8 → 5.9; phone heights unchanged.
- **Process:** visual design produced with `/impeccable` during `5-build`, using Tailwind. Fonts, exact palette, mascot: left to `/impeccable`.
- **Built (slice 7):** Market Stall world, documented in `DESIGN.md` (tokens, components, rules) and `.impeccable/design.json`; product record in `PRODUCT.md`; direction contract in `.impeccable/surfaces/app.md`. Tokens and component classes (`.board`, `.tag`, `.btn-press`, `.btn-crate`, `.stamp`, `.sign`, `.ruled`, `.row-rule`, `.field`, `.check`) live in `app/globals.css`; fonts self-hosted with `next/font` (Bowlby One, Figtree); icons from `lucide-react` (no emoji icons). Navigation: `components/Nav.tsx`. Reviewed by an independent finish reviewer over three rounds (disposition: ship); one minor item unverified on screen (empty List guidance on first use).

## Components

### Sign-in and App Shell
Clerk sign-in; every page and server route requires a signed-in user, **except the landing page at `/`** *(added after final review)*: `middleware.ts` marks `/` public; `app/page.tsx` sends signed-in people into the app (`components/HomeRedirect.tsx`: Budget if no active week, else Plan) and shows signed-out visitors the landing (`components/landing/`). `components/ConvexClientProvider.tsx` lets signed-out visitors through its database gate on `/` only (the landing needs no data); everywhere else the gate still shows the app only once Convex accepts the Clerk token. The app nav is hidden on `/` and `/sign-in`. *Judging-guide fixes:* Mise's own sign-in page (`app/sign-in/[[...sign-in]]/page.tsx`, Clerk `<SignIn />` styled to Market Stall, `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, email form first and Google below since judges use the demo login, title "Continue to Mise" via Clerk localization) replaces Clerk's hosted page; after "Use this plan" the Week board shows "Your shopping list is ready: N items to buy → Go shopping"; the plan card notes that prices are Kroger's current estimates and the register can differ; recipes read from links note "Read by the crew … check amounts against the original". Navigation between Budget, Plan, and List; the tally header shows on the Plan and List screens.

### Landing Page (`components/landing/`) *(added after final review, Tarik's request)*
Built with the `/impeccable` flow: Persuade mode inside the Market Stall world; structure "Walk the market" (dealt by the concept roll and locked by Tarik); code-led (no image generation); direction contract in `.impeccable/surfaces/components-landing.md`. A striped awning and the Mise sign; first screen "Stay under budget. Eat well." with "See how it works" (becomes "Watch the demo" once `DEMO_VIDEO_URL` in `Landing.tsx` is set) and "See the code on GitHub"; the first stall is a live chalkboard tally (`TallyStall.tsx`) that ticks six sample rows paid once when in view (reduced motion: final state). Four stalls (crew, week board, list, recipe shelf) each show a real screen from a **demo account's sample week** (Clerk dev user "Demo Week", data seeded through the app's own Convex functions; screenshots in `public/landing/*.webp` with provenance sidecars), then "The money math is plain code, never the AI" and a closing call to action. No testimonials or metrics.
PRD ref: `prd.md > Screens and Layout`.

### Budget Setup Screen
First-use screen when no active week exists. Shows the suggested weekly budget (from `lib/usda.ts`) labeled "based on USDA food-cost data", an editable number, and a "help me figure it out" link to the chat. Saving creates a week in Convex.
PRD ref: `prd.md > Budget Setup`.

### USDA Budget Calculator (`lib/usda.ts`)
Plain code, no AI. Holds the USDA weekly cost per person for male 19–50, female 19–50, and male 14–18 at thrifty, low-cost, and moderate levels (constants copied from the latest report, with report month and URL in a comment), adds them, and applies USDA's 3-person household adjustment. Default suggestion: **low-cost plan** (see Decisions).
PRD ref: `prd.md > Budget Setup`.

### Planner Chat
Chat screen (`app/plan/page.tsx`) using the AI SDK's chat hook. Messages go to the chat route; Claude's replies can include cards. **Changed in build:** pasted recipe links are actually read (see Recipe Import); conversations are **saved** after each reply and reopened on return (`convex/chats.ts`, `components/ChatMenu.tsx` for "+ New chat" and the Chats list); dinners removed on a plan card are saved with the chat and sent to the crew so swaps respect them.
PRD ref: `prd.md > Meal Planning Chat`.

### Chat Route and the Staff's Tools (`app/api/chat/route.ts`)
Server route: checks sign-in, loads the week, list, pantry, household, and saved recipes from Convex with the user's token, sends the conversation plus the staff's job description (`lib/staff-prompt.ts`) to Claude Sonnet, and offers these tools:
- `suggestBudget` — Claude picks a USDA level; code supplies the numbers → **Budget Card**.
- `proposeMealPlan` — Claude supplies days, meal names, servings, and either its own ingredients (amount + unit) or a saved `recipeId`. Code fills recipe dinners (scaled), checks the plan (`validatePlan`: ≤7 days, sized for the household), searches Kroger one ingredient at a time while streaming progress, has Claude Haiku pick products or substitutes (`lib/pick-products.ts`), prices whole packages (`lib/meal-plan.ts`, `lib/quantities.ts`), and compares to the remaining budget → **Meal Plan Card** + **Budget Fit**.
- (Cards' **Use this plan** calls `convex/plans.ts > usePlan` with mode "replace" or "add"; "add" keeps existing dinners and raises packs on matching unpaid rows.)
- `importRecipe` — reads a website or YouTube link (`lib/recipes/import.ts`), saves it to My Recipes → **Recipe Card**. *(Added in build, slice 5.)*
- `findSales` — scope `needed` (this week's unpaid list rows, re-priced by product ID), `regulars`, or `recipes` (the 12 ingredients saved recipes use most, searched one at a time; a sale counts only among Kroger's first 3 products whose name has every word of the ingredient, `lib/sales.ts`) → **Sales Card**. The crew may repeat only the card's numbers. *(Added on submission day.)*
The job description: ask dish type first, then days; use store names; produce in sold units; respect the pantry; plan saved recipes by id.
PRD ref: `prd.md > Meal Planning Chat`.

### Cards (`components/cards/`)
The fixed set of generated-UI pieces: **Budget Card** (levels, Use button), **Meal Plan Card** (dinners with "serves 3½", cost, remove ✕, what-to-buy list with photos, packs, swaps; pantry chips), **Budget Fit** (fits / over by $X), plus build additions: **PlanResult** (remove/re-price and "Use this plan"), **PricingProgress** (progress bar), **PantryChips**, **RecipeCard**, **SalesCard** (sale items with was/save, recipe links). The chat screen maps each tool result to its card.
PRD ref: `prd.md > Screens and Layout`, `prd.md > Meal Planning Chat`.

### Kroger Client (`lib/kroger.ts`)
Server-only. Gets an access token (one shared request even when many searches start at once, refreshed a minute before it expires), lists Kroger-family stores within 10 miles of `KROGER_ZIP`, searches products at the chosen store (top 20, re-ranked so exact-phrase matches come first), looks up saved products by ID for re-pricing, and returns prices (promo if present, else regular, plus `regularPrice` when on sale), package size, and a photo. Plan pricing totals sale savings in code (`savings` on the plan, `saved` per item); the product picker sees "ON SALE" on options and prefers them when equally right; list rows store `regularPrice`. Searches run one at a time (`KROGER_CONCURRENCY = 1`) and are remembered for 30 minutes. *(Hardened in build after a burst of token requests got the connection blocked by Kroger's firewall for ~10 minutes.)* Server routes: `app/api/stores`, `app/api/price`, `app/api/products`.
PRD ref: `prd.md > Shopping List and Prices`.

### Shopping List Screen
`app/list/page.tsx`. Store picker at the top ("Shopping at"): Pick 'n Save and Metro Market stores near the ZIP plus non-Kroger stores Tarik added; the choice is saved on the week and carried into the next; switching Kroger stores re-prices Kroger rows by product ID (estimates he typed are kept). Each row (`components/ListRow.tsx`): item, product photo and name, Kroger estimate × packs (or "no price found" with an editable estimate), − / + pack count, "Change brand" (`components/ProductPicker.tsx`), remove, and a paid box with the number keypad. Rows turn green or orange with a sentence saying which. A manual "Add an item" box stays (Tarik's choice). *Added after slice 9 (Tarik's request):* with 2+ dinners scheduled, an **All items | By dinner** toggle (remembered per device) regroups the same rows by dinner (`lib/list-groups.ts`, matched against each dinner's stored ingredients by name; no new data): "Shared by 2+ dinners" first (shown once, with a "for …" line naming the dinners, so a merged 3-pack never looks bought twice), then each dinner in day order, then "Everything else" (extras, regulars, hand-added). *Final review (Tarik):* a third option, **By plan** (`lib/list-groups.ts > groupByPlan`), shown once 2+ plans are on the board: dinners added by one "Use this plan" / "Add to this week" share a `planId`; each plan shows its dinners as the title, its rows, its cost (paid where paid, else estimate × packs) and "Send this plan to Instacart" (the server works out the plan's rows); an item two plans share stays one row, shown in both with "shared · also in …", and counts in each plan's cost; dinners from before plans were tracked group as "Earlier dinners". *Slice 10:* a **Scan** button (`components/BarcodeScanner.tsx`) opens a full-screen camera sheet (rear camera; `barcode-detector` ponyfill = ZXing in WebAssembly, loaded only when scanning, so iPhone Safari works; formats UPC-A/E, EAN-13/8; checked every 300 ms; the phone buzzes on a read). `lib/barcode.ts` checks the GS1 check digit (misreads rejected), expands short UPC-E, accepts a UPC read as a 13-digit EAN, and returns either a Kroger productId (drop the check digit, pad to 13) or a store-sticker price (`2 IIIII A PPPP C`, price in cents, max $99.99). A product is looked up at the chosen store (`app/api/barcode` → `productsById`) and added to the viewed week's list, or reported "already on your list"; a sticker asks "which item is it?" and fills that row's paid amount (the sticker's item number is the store's own scale code, so it can't be matched automatically). A "type the numbers" box covers cameras that can't read a code, or pages opened without https. *Slice 11:* **Send to Instacart** (`components/SendToInstacart.tsx` → `app/api/instacart`) sends the viewed week's **unpaid** rows (paid = already bought) as an Instacart shopping-list page and opens it in a new tab (opened on tap so phones don't block it; `opener` cut). The recipe view has the same button for one recipe, scaled to the servings shown. *Added after slice 11 (Tarik's request):* **Compare stores** (`components/CompareStores.tsx`, `lib/compare.ts`) prices the unpaid rows at two Kroger-family stores he picks (default: last Kroger store vs the nearest store of the other chain; second pick remembered) through the existing price route, one store at a time; same product by productId where chosen, else the top match. Shows both totals over items both stores carry (× packs), which store is cheaper and by how much (in words, not green: green means under budget), the 5 biggest differences, and items only one or neither store has. Instacart can't feed this: its API returns links, not prices (see decision 003).
PRD ref: `prd.md > Shopping List and Prices`, `prd.md > Running Tally`.

### Tally Header and Budget Math (`lib/tally.ts`)
Plain code: spent = sum of paid amounts this week (added in whole cents); left = budget − spent; days left = 7 − days since week start; status = under/over; row color = paid vs. estimate × packs. Shown as "$142 of $200 this week · $58 left · 4 days left" with an under/over message. Covered by `lib/tally.test.ts`. *After final review (Tarik):* once the big board scrolls under the top menu, a slim pinned copy (`components/TallyHeader.tsx > ScrollPin`: "$207 left · $18 of $225" plus the Dinners/Extras pills) stays just below the menu, so the tally is always visible while scrolling the List or the chat; it floats (no layout jump) and is hidden from screen readers, which already hear the big board's updates.
PRD ref: `prd.md > Running Tally`.

### Regulars and Extras (`components/RegularsSection.tsx`, `components/ExtrasSplit.tsx`, `convex/regulars.ts`) *(added in build, slice 6)*
Regulars live on the Pantry page, priced through the Kroger client, with "Change brand" / "Find at Kroger" (same top-5 picker as the List); "Add regulars" re-prices each one at the current store (same product by ID) before adding, refreshing the saved price; "Add regulars" on the List and an auto-add option (new weeks, via `weeks.setBudget`) copy them onto the list as extras. `weeks.extrasBudget` holds the Extras share (kept into the next week). `lib/tally.ts > computeSplitTally` splits spending by row category (`categoryOf`: plan items dinner, others extra, overridable), shown as a second tally line; the chat route passes the Dinners remaining to the crew and Budget Fit. `suggestExtras` suggests the share from the regulars' total.

### Week Board (`app/week/page.tsx`, `convex/plans.ts`, `lib/weeks.ts`) *(added in build, slice 8)*
Weeks are date-aware: "this week" is the week whose 7 days include now (`lib/weeks.ts > currentWeek`), so a next week created ahead takes over on its first day; `weeks.byOffset` / `weeks.ensureNext` (shared `ensureNextWeek` in `convex/model.ts`). Dinners (`meals`) carry `dayIndex` (missing = Idea) plus their scaled `ingredients` and chosen `products`. `rebuildWeek` re-prices a week's scheduled dinners with `lib/meal-plan.ts > priceBoard` and replaces only list rows flagged `fromBoard` (unpaid); paid, hand-added, and pre-board plan rows are untouched. `plans.usePlan` places dinners on open days (`openDays`), `plans.moveMeal` / `removeMeal` rebuild affected weeks. Layout (redesigned after Tarik's phone review, from two reference apps): on a phone the board shows **one column per screen** with the neighbours peeking, a **day strip** above it to jump to a day (today ringed, a dot when a dinner is planned) that follows the swipe, and opens on today. Columns have a header (day, date, today badge, dinner count); cards show the recipe photo, name, servings, and estimated cost. Moving and removing live behind a card's **"···"** button: a bottom sheet on phones, a centred panel on desktop, rendered outside the board (a React portal) so nothing clips it. Drag-and-drop (dnd-kit, `@dnd-kit/core`) is **desktop-only** via a grip handle, since a swipeable phone board and dragging fight each other; on desktop the board spans the window and cards stack the photo on top. The List and tally take a week offset (This week / Next week).

### My Pantry (`app/pantry/page.tsx`, `convex/pantry.ts`) *(added in build, slice 4)*
Staples marked have / out, remembered across weeks. The chat route passes them to the crew; the plan card's pantry chips flip an item to "need it", price it, and save the change.
PRD ref: `prd.md > My Pantry`.

### Household (`components/HouseholdSettings.tsx`, `convex/household.ts`, `lib/household.ts`) *(added in build, slice 4)*
Servings per dinner (default 3½: teen counted as 1½) and a leftovers toggle (+1½ → 5). Used to size plans and to scale recipes.
PRD ref: `prd.md > Budget Setup`.

### Recipe Import (`lib/recipes/`) *(added in build, slice 5)*
`import.ts` checks the link is safe (`safe-url.ts`: no local or private addresses). Websites: page fetched, recipe read from built-in data (`parseJsonLdRecipe.ts`, `parseMicrodataRecipe.ts` from Digero; sectioned steps fixed). YouTube (`youtube.ts`): title/description/thumbnail from the official Data API, spoken transcript from the public video page (Digero's approach), Claude Sonnet extracts the recipe transcript-first. *Slice 9:* a video is first checked for a written-recipe link in its description (`links.ts`: addresses or nearby text saying "recipe"; shop, gear, social, sponsor, blog-home and category links skipped — tuned on the 86 real playlist descriptions, 49 of which link a recipe); up to 2 links are read with the website reader, and only if none works does it fall back to transcript + description. The website reader falls back to **TinyFish** (renders the page like a browser) + Claude Sonnet when a site blocks plain fetching or has no built-in recipe data. Claude Haiku turns ingredient lines into name/amount/unit with flags for pantry, `fixed` (frying oil), and `madeInRecipe`. `scale.ts` scales by math (whole items round up; pinches and fixed amounts don't scale); `units.ts` formats amounts in the chosen system — a **US | Metric** toggle on the recipe view, remembered per device (US converts grams to oz/lb and watery liquids to cups; metric converts cups/tbsp/oz/lb to ml/g; counts unchanged; volumes of solids convert to ml, not grams, since that needs the food's density) — with kitchen fractions ("3¾ cups"); the recipe view labels ingredients that don't scale or are made in an earlier step.
PRD ref: `prd.md > Recipes`.

### My Recipes and Recipe View (`app/recipes/`, `convex/recipes.ts`) *(added in build, slice 5)*
Shelf of saved recipes (imported, or the crew's own dinners saved on "Use this plan") with this week's dinners on top; *slice 9:* a **Sync my playlist** button (`app/api/playlist` → `lib/recipes/playlist.ts`, 50 videos per page, private/deleted skipped → `recipes.addUnread`, which skips videos already saved by video id) adds playlist videos as **not read yet**; opening one reads it (`app/api/recipes/read`, a reading panel on the recipe view; the page fills in when the save lands), and a plan that uses one reads it first (progress bar: "Reading the recipe: 1 of 2"). The crew sees up to 150 saved titles with their tags; **tags** (slice 9): any recipe never tagged (new playlist videos, pasted links, the crew's dinners) is tagged when the shelf loads (`app/api/recipes/tag` → `lib/recipes/auto-tag.ts`: Claude Haiku, 50 recipes per call, picking only from the fixed list in `lib/recipes/tags.ts`, so chips stay tidy; 86 real titles took ~21 s); Tarik edits tags on the recipe view (`components/TagEditor.tsx`, free words allowed); a **search box** and **tag chips** (16 most used; every chosen chip must match) filter the shelf in the browser (`lib/recipes/filter.ts`); recipe view with photo, source badge, time, servings stepper, scaled ingredients, numbered steps, and the original link. Layout borrowed from Digero's recipe screens.
PRD ref: `prd.md > Recipes`.

## Data Model
All in Convex, every record tagged with the signed-in user's ID (directly, or through its week).

- **weeks** — `userId`, `budget`, `planLevel` ("thrifty" | "low" | "moderate" | "custom"), `startDate`, `storeId` / `storeName` (last Kroger store picked), `otherStore` (shopping at a non-Kroger store). The "active week" is the latest one less than 7 days old; after 7 days, Budget Setup appears again.
- **listItems** — `weekId`, `name`, `estimate` (price per package, or empty), `estimateSource` ("kroger" | "manual"), `productId` / `productName` / `size` / `imageUrl` (chosen Kroger product), `packs`, `paid`, `fromPlan` (added by "Use this plan"; replaced by the next plan unless paid).
- **meals** — `weekId`, `day`, `name`, `estimatedCost`, `servings`, `recipeId`, `dayIndex` (0–6; missing = Idea), `planId` (final review: dinners added together), `ingredients`, `products` (slice 8: the board rebuilds the list from these). Written by "Use this plan", moved on the Week board.
- **recipes** *(slice 5)* — `userId`, `title`, `sourceType` ("web" | "youtube" | "crew"), `sourceUrl`, `sourceName`, `imageUrl`, `servings`, `totalMinutes`, `ingredients` (raw, name, amount, unit, pantry, fixed, madeInRecipe), `steps`, `tags` (slice 9; missing = never tagged), `unread` (slice 9: a playlist video not read yet — no ingredients or steps, placeholder servings). The same link saved again updates the existing recipe and clears `unread`.
- **chats** *(slice 5)* — `userId`, `title`, `updatedAt`, `messagesJson` (the conversation including card data), `removedJson` (dinners removed per plan card).
- **pantry** *(slice 4)* — `userId`, `name` (lowercase), `have`.
- **household** *(slice 4)* — `userId`, `servings`, `leftovers`.
- **otherStores** *(slice 2)* — `userId`, `name`.
- **receipts** *(submission day)* — `userId`, `weekId`, `store`, `subtotal`, `tax`, `fees`, `total`, `at`, `fromPhoto`. List items gain `receiptId` (paid rows covered by a confirmed trip); weeks gain `sample` (labelled demo history). The tally adds paid boxes of rows without a receipt plus receipt totals (`lib/tally.ts > actualPaid`); History rolls weeks up by week/month/quarter (`convex/history.ts`, `lib/history.ts`). Photos are read by Claude Sonnet in `app/api/receipt` (shrunk to ≤1600 px on the phone; not stored).
- **regulars** *(slice 6)* — `userId`, `name`, `packs`, `estimate`, `productId` / `productName` / `size` / `imageUrl`. Weeks gain `extrasBudget`; list items gain `category` ("dinner" | "extra"); household gains `autoRegulars`.
- Shared helpers (who's signed in, the active week, the product shape, adding regulars) live in `convex/model.ts`, so function files never import each other.

Leaving and coming back: everything, including planner chats, is in Convex, so any device shows the same week after sign-in.

## File Structure
As built (curriculum skill folders and generated Convex files omitted):

```
app/
  layout.tsx · page.tsx · globals.css
  budget/page.tsx            # Budget Setup + Household
  plan/page.tsx              # Planner chat, saved chats, cards
  week/page.tsx              # Kanban week board (1 or 2 weeks)
  list/page.tsx              # Shopping list, store picker, add item
  pantry/page.tsx            # My Pantry
  recipes/page.tsx           # My Recipes shelf + this week's dinners
  recipes/[id]/page.tsx      # Recipe view
  api/chat/route.ts          # Claude + tools (proposeMealPlan, importRecipe, suggestBudget)
  api/stores · api/price · api/products   # Kroger server routes
  api/instacart              # list or recipe → Instacart page link (slice 11)
  api/barcode                # scanned product → Kroger price at the chosen store (slice 10)
  api/playlist · api/recipes/read · api/recipes/tag   # playlist sync; read a not-yet-read recipe; auto-tag (slice 9)
components/
  TallyHeader · ListRow · ProductPicker · HouseholdSettings · ExtrasSplit · RegularsSection · ChatMenu · ConvexClientProvider
  cards/  BudgetCard · BudgetFit · MealPlanCard · PlanResult · PricingProgress · PantryChips · RecipeCard
lib/
  tally.ts · usda.ts · household.ts · quantities.ts · meal-plan.ts · list-groups.ts · barcode.ts · instacart.ts · compare.ts · pick-products.ts · staff-prompt.ts
  kroger.ts (server) · kroger-client.ts (browser)
  recipes/  import · youtube · playlist · links · tags · auto-tag · filter · safe-url · scale · units · parseJsonLdRecipe · parseMicrodataRecipe · youtubeUrlParser · recipeTypes
  convex-token.ts            # sign-in pass for server routes calling Convex
  *.test.ts                  # 7 test files
convex/
  schema.ts · model.ts (shared helpers) · weeks.ts · listItems.ts · plans.ts · pantry.ts · regulars.ts · household.ts · recipes.ts · chats.ts · auth.config.ts
scripts/
  kroger-probe.mjs · plan-probe.mts · import-probe.mts   # real-service checks used during the build
middleware.ts · next.config.ts · .env.example
devpost/                     # planning docs (learner-profile.md git-ignored)
```

## External Services and Dependencies

### Kroger Public API
Docs: https://developer.kroger.com/documentation/public/getting-started/quick-start · Products API reference on developer.kroger.com.
**Verified in build (slice 2) with `scripts/kroger-probe.mjs`: token, locations, and products calls work as below (token lasts 1800 s).**
- Token: `POST https://api.kroger.com/v1/connect/oauth2/token`, body `grant_type=client_credentials&scope=product.compact`, header `Authorization: Basic base64(client_id:client_secret)` → `{ access_token, expires_in }` (~30 min).
- Store lookup: `GET https://api.kroger.com/v1/locations?filter.zipCode.near={KROGER_ZIP}&filter.limit=1` → `data[0].locationId`.
- Price search: `GET https://api.kroger.com/v1/products?filter.term={ingredient}&filter.locationId={id}&filter.limit=1` → `data[0].items[0].price.regular` / `.promo` (prices appear only when a `locationId` is given).
- Rate limits: a daily call cap on the free tier (expected thousands/day; confirm). Cost: free.
- Barcode → product *(verified in build, slice 10)*: `productId` = the UPC/EAN without its check digit, left-padded to 13 (`GET /products?filter.productId=…&filter.locationId=…`). Real lookups at Pick 'n Save 11th & Garfield: Heinz ketchup 013000006408 → 20 oz $4.49; Cheerios 016000275287 → 18 oz $5; Coca-Cola 2 L 049000050103 → $2.50; Coca-Cola can (UPC-E 04963406) → $4.99.

### YouTube Data API v3 *(added in build, slice 5)*
Docs: https://developers.google.com/youtube/v3 · key `YOUTUBE_API_KEY` (free quota: 10,000 units/day; a video lookup costs 1 unit, a playlist page 1). Used for video title, description, and thumbnail, and in slice 9 for playlist items (`YOUTUBE_PLAYLIST_ID`). Transcripts aren't available through the API without Google sign-in, so they're read from the public video page (may break if YouTube changes it; import then falls back to the description).

### TinyFish *(added in build, slice 9)*
Docs: https://docs.tinyfish.ai/fetch-api · `POST https://api.fetch.tinyfish.ai` with `X-API-Key: TINYFISH_API_KEY`, body `{ urls, format: "markdown" }` → rendered page text. Fallback only: recipe sites that block plain fetching or lack built-in recipe data. Probe of all 49 playlist recipe links: most parse with a plain fetch; TinyFish read the ones without recipe data (Joshua Weissman, School of Wok — confirmed in TinyFish's usage log), but The Woks of Life blocks it too (`bot_blocked`), so those videos fall back to the transcript.

### Instacart Developer Platform *(added in build, slice 11)*
Docs: https://docs.instacart.com/developer_platform_api · `POST /idp/v1/products/products_link` (shopping list) and `/idp/v1/products/recipe` (recipe: `servings`, `cooking_time`, `author`, `instructions`, pantry toggle), header `Authorization: Bearer INSTACART_API_KEY` → `{ products_link_url }`. `lib/instacart.ts` (unit handling adapted from Digero): rows with a chosen Kroger product send its exact UPC (rebuilt from the productId: 11 digits + check digit), others send the name; one line per product (Instacart rejects a UPC twice); recipe units mapped to Instacart's (lb → pound, tbsp → tablespoon…; clove/pinch/sprig → 1 each, so 7 cloves isn't 7 heads); things made in an earlier step left out. **The current key is a development key:** it works only on `connect.dev.instacart.tools`, whose links open Instacart's sandbox store (real catalog and prices, Pick 'n Save preselected for ZIP 53206, but no real orders); production needs a production key from Instacart and `INSTACART_API_BASE=https://connect.instacart.com`. Tested on the sandbox: UPC matches land on the exact product (Heinz 20 oz, Coca-Cola 2 L); packaged items always arrive as quantity 1 whatever quantity/unit is sent (loose produce honours counts), so Tarik adjusts packaged quantities in Instacart.

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
- **Kroger's firewall blocks a burst of requests** *(happened in build)* → prevented by one shared token request and one-at-a-time searches; if Kroger is unreachable, the chat says so instead of showing a $0 plan.
- **A recipe link can't be read** (no recipe data, blocked, private address) → the crew says so and asks for the ingredients; nothing is saved.
- **YouTube transcript unavailable** → extraction uses the description only.

## What Was Simplified and Why
- **Fixed cards** instead of open-ended generated UI — readable, debuggable, matches the learning goal. Fuller version: an OpenUI-style renderer letting Claude compose new components.
- ~~**Chat history not saved**~~ — *changed in build (slice 5): chats are saved in Convex.*
- **Kroger's top match is the default product**; Tarik can tap "Change brand" to pick from the top 5 (brand · size · price). The chosen product is saved and re-priced by ID when he switches stores. *(Changed in build, slice 2.)*
- **USDA numbers copied in once** instead of fetched — the reports are monthly PDFs. Fuller version: a scheduled job that reads each new report.
- **Quantities priced as whole packages** *(changed in build)*: Claude returns each ingredient with an amount and unit; code reads Kroger's package size ("1 lb", "24 ct"), converts units, adds amounts across meals, then rounds up to packages (cost to buy). Unconvertible units fall back to 1 package marked "check amount"; pantry staples are flagged "probably have it" and add $0 until needed. Rows have a pack count (×1, ×2…) Tarik can change.
- **Other stores without prices** *(added in build)*: Tarik can add non-Kroger stores (Sendik's, Whole Foods); while shopping there, rows compare what he paid against Kroger prices from the last Kroger store he picked. Price history across stores stays Later.
- **Stores limited to Kroger-family stores near the ZIP** (Pick 'n Save, Metro Market) — other chains show "no price found".
- **Substitutes instead of web search** *(build)*: when Kroger has no real match, Claude names an everyday swap and the app prices it; no third price source.
- **Meal sizes trust Claude's amounts** *(build)*: code checks each dinner's stated servings, not whether its amounts truly match; recipes from links are scaled by real math.
- **Search runs in the browser, not a Convex search index** *(build, slice 9)*: the shelf already loads every recipe (~90), so filtering them as you type is instant with no index to maintain; switch to a Convex search index if the shelf passes ~1,000 recipes. Vector (meaning-based) search stays Later; mood requests go through the crew, which sees titles and tags.
- **Playlist recipes read on demand** *(build, slice 9)*: titles sync instantly; each video is read the first time it's opened or planned (reading all 86 up front would cost ~86 Claude calls and minutes of waiting for recipes that may never be cooked).

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
