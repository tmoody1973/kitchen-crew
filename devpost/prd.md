---
doc: prd
status: approved
---

# Kitchen Crew (working name) — Product Requirements

A playful kitchen helper that plans a few days of meals for Tarik's family of three, turns them into a Kroger-priced shopping list, and keeps a running tally against the weekly budget while he shops.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

## The Core Journey
Source: `scope.md > The Core Loop`, `scope.md > What "Working" Looks Like`.

1. **First open — budget setup.** The staff suggests a weekly budget for a family of three based on USDA food-cost data. Tarik can accept it, type his own number, or optionally answer a few quick questions about what he likes to cook to refine it.
2. **Plan meals in chat.** Tarik asks what to cook. The staff (one voice) first asks what kind of dishes he's in the mood for — he can paste a few recipe names or links for inspiration — then asks how many days to plan.
3. **Get the plan.** The staff proposes meals for those days, each with an estimated cost, and shows whether the plan fits the remaining budget.
4. **Adjust.** If a meal pushes the plan over budget (or he just doesn't want it), Tarik edits the plan directly or chats with the staff to change it.
5. **Shopping list.** The plan becomes a shopping list: each item with its Kroger estimated price and an empty box for what he actually paid.
6. **In the store.** Tarik types the actual price into each row as he shops. Rows color-code against the estimate; the tally at the top updates — e.g. "$142 of $200 this week · $58 left for 4 days."
7. **Success.** The tally shows he's **under budget this week**.

*Grew during the build (details below):* he picks which Pick 'n Save or Metro Market he's shopping at; pastes recipe website or YouTube links and the crew reads the real recipe; marks pantry staples he has or is out of; sizes dinners for his household (teen counted as 1½, optional lunch leftovers); and his planner chats are saved so he can leave and come back.

## Screens and Layout
- **Landing page** *(added after final review)* — the public front door at `/` for signed-out visitors and Devpost judges: what Mise does, a live sample tally, real screens from a demo week, and links to the demo video and GitHub; signed-in people skip it and go straight into the app.
- **Budget setup** — first-use only: suggested weekly budget, a field to change it, optional "help me figure it out" questions.
- **Planner chat** — conversation with the staff; replies come back as interactive cards (meal plan, budget fit) rather than plain paragraphs, per `scope.md > Inspiration & Identity` (generative UI). The plan is editable in place.
- **Shopping list** — tally pinned at the top; list rows below (item · Kroger estimate · actual-paid box).
- **My Pantry** *(added in build, slice 4)* — staples he has or is out of, remembered across weeks.
- **My Recipes** *(added in build, slice 5)* — this week's dinners plus every saved recipe; a **recipe view** with photo, source, time, ingredients scaled by a servings stepper (metric amounts shown with American units), and numbered steps.
- **Household** *(added in build, slice 4)* — on the Budget page: servings per dinner and a leftovers toggle.
- **Saved chats** *(added in build, slice 5)* — the planner reopens the most recent conversation; "+ New chat" and a Chats list, like Claude.
- Movement: top navigation (Budget · Plan · List · Pantry · Recipes); the tally is visible wherever spending is shown.

## Look and Feel
- **Vibe:** playful, Duolingo-like — friendly, encouraging, game-ish energy; bright and bold rather than a sober finance app.
- **Design process:** visual design will be produced with the `/impeccable` skill during `5-build`, using this vibe as its brief.
- **Color carries meaning:** price rows color-code (paid ≤ estimate vs. paid > estimate); the tally signals under/over budget.
- Not established: specific fonts, palette, or mascot/character. Leave to `/impeccable`.
- *Decided in build (slice 7, with `/impeccable`):* the **Market Stall** look, chosen by Tarik over "Cutting Board": the tally is a slate farmers-market price board whose numbers flip when they change; every price is a tilted yellow shelf tag; chunky tomato press buttons; verdicts are stamps; page headings stand like stall signs. Kale green only means under budget / paid ≤ estimate and squash orange only means over, always with words. Fonts: Bowlby One (signs and numbers) and Figtree (reading). Name: **Mise**. Full system in `DESIGN.md`.

## Features and Behavior

### Terms and Privacy *(added on submission day, at Tarik's request)*
- [ ] Public `/terms` and `/privacy` pages in plain English, linked from the landing footer and the sign-in page ("By signing in you agree…"). Privacy names what's kept (account, entries, receipt totals; receipt photos not kept; Kroger keys only in device cookies), each service data goes to and why, no ads/analytics/selling, and deletion requests via a GitHub issue (Tarik's choice; no email published).

### First Sign-in *(added on submission day, at Tarik's request)*
- As anyone trying Mise, I want it to plan for my household, not Tarik's.
  - [ ] A brand-new account opens a three-step Welcome: what the crew should call them; who's eating (men, women, teen boys, teen girls, kids 6–11, little kids 1–5) plus "plan leftovers"; and a weekly budget from USDA's September 2026 food-cost tables for that exact household (size-adjusted), or their own amount.
  - [ ] Dinner servings follow from the people (adults 1, teens 1½, kids ¾, little kids ½); the crew greets them by name and plans for their household. Existing accounts (Tarik, Demo) skip it and keep Tarik's household as the default.

### Budget Setup
Source: `scope.md > The POC Boundary` (USDA-seeded budget).
- As Tarik, I want a sensible starting budget suggested for me so that I don't have to guess.
  - [ ] On first open, a suggested weekly amount for a family of three appears, labeled as based on USDA food-cost data.
  - [ ] Tarik can replace it with his own number, and the tally uses whichever he chose.
  - [ ] An optional path asks a few questions about what he likes to cook and returns an adjusted suggestion.
  - [ ] **Household size:** he sets servings per dinner (default 3½: two adults plus a teen counted as 1½) and can turn on "plan leftovers for lunch" (dinners serve 5). *(Added in build, slice 4.)*

### Meal Planning Chat
Source: `scope.md > The Core Loop`.
- As Tarik, I want the staff to help me decide what to cook for the next few days so that I plan ahead instead of improvising in the store.
  - [ ] Asking for a plan, the staff first asks what kind of dishes he wants, then how many days.
  - [ ] Pasted recipe names/links are used as inspiration in the plan.
  - [ ] The plan shows each meal with an estimated cost and whether the total fits the remaining budget.
  - [ ] Answers appear as interactive cards, not just text.
  - [ ] Tarik can change a meal by editing the plan or by asking in chat; costs and budget fit update.
  - [ ] Every dinner says how many it serves, sized to his household; dinners sized too small are sent back to the crew. *(Added in build, slice 4.)*
  - [ ] While a plan is priced, a progress bar shows how far along it is. *(Added in build, slice 3.)*
  - [ ] "Use this plan" turns the plan into shopping list rows; his own and already-paid items are kept. *(Slice 4.)*
  - [ ] "Add to this week" adds a plan's dinners without replacing the current plan, so dinners from different chats can be combined; ingredients already on the list get more packs instead of duplicate rows. *(Added in build, slice 5.)*
  - [ ] When the store has no real match for an ingredient, the crew suggests an everyday substitute and prices that, shown as a swap. *(Added in build, slice 5.)*
  - [ ] Plans show Kroger sales: "Includes $X in Kroger sales" under the total and "On sale · was $Y" on each sale ingredient; when two products are equally right, the sale one is picked. Asking "what's on sale?" shows a Sales card for this week's list, his regulars, or the ingredients his saved recipes use most, and the crew can offer dinners from those recipes. The crew only repeats savings the cards show. *(Added on submission day, at Tarik's request. Kroger's API has sale prices but no coupons.)*
  - [ ] His planner conversations are saved: leaving to open a recipe, reloading, or switching devices returns to where he left off; he can start a new chat or reopen an older one. *(Added in build, slice 5.)*

### Recipes *(added in build, slice 5)*
- As Tarik, I want to plan from real recipes I like so that the plan and shopping list match what I'll actually cook.
  - [ ] Pasting a recipe website or YouTube link makes the crew read the real recipe (ingredients, steps, servings, time, photo) and save it to My Recipes.
  - [ ] Asking the crew to find recipes online ("find me a cozy chickpea curry") shows a Recipe Search card of real recipe pages (TinyFish web search); **Add** on any result reads and saves it to My Recipes without leaving the chat, ready to plan with. *(Added on submission day, at Tarik's request.)*
  - [ ] My Recipes has its own "Paste a recipe or YouTube link" box: the same reader saves it and the recipe opens, no chat needed. *(Added on submission day, at Tarik's request.)*
  - [ ] *(Slice 9)* "Sync my playlist" adds every video from Tarik's YouTube recipe playlist to My Recipes (syncing again adds only new ones); each recipe is read the first time it's opened or planned — from the written recipe the channel links when there is one, otherwise from the video.
  - [ ] *(Slice 9)* Recipes get tags automatically (cuisine, main protein, kind of dish, traits like quick, spicy, one-pan, comfort); he can remove a tag or add his own; a search box (titles, ingredients, tags, channel) and tag chips narrow My Recipes; the crew answers "something cozy" or "quick chicken" from his shelf.
  - [ ] He can ask the crew to plan with a pasted or saved recipe; its ingredients are scaled to his servings by code (whole items round up; frying oil and pasta water don't scale; things made earlier in the recipe aren't bought).
  - [ ] Tapping a dinner opens its recipe view, with ingredients rescaled by a servings stepper and a **US | Metric** toggle (e.g. "397 g" ↔ "14 oz", "3¾ cups" ↔ "887 ml").
  - [ ] The crew's own dinners are saved as recipes, with short steps, when he uses a plan.

### Regulars and Extras *(added in build, slice 6)*
- As Tarik, I want snacks, fruit, and drinks counted so that "under budget" reflects everything I actually buy.
  - [ ] A Regulars list (on the Pantry page) of things bought most weeks, each priced at the chosen store, with a pack count and a brand choice; prices refresh from Kroger each time they're added to a list.
  - [ ] "Add regulars" puts them on the week's list in one tap (no duplicates); an option adds them automatically to each new week.
  - [ ] The weekly budget splits into Dinners and Extras (on the Budget page), with a suggestion from the regulars' total.
  - [ ] The tally shows both halves ("🍽 Dinners $98 of $160 · 🛒 Extras $41 of $62"); the crew and the Budget Fit card plan dinners against the Dinners share.
  - [ ] Every list row is labeled 🍽 dinner or 🛒 extra (plan items are dinners; regulars and hand-added items are extras), tap to switch.

### Week Board *(added in build, slice 8)*
- As Tarik, I want to see and rearrange the week's dinners on a board so that I can mix plans and plan two weeks for one big shop.
  - [ ] A Kanban-style board (Week tab): an Ideas column plus one column per day; dinner cards show servings, estimated cost, and a recipe link.
  - [ ] Move a card to another day, to next week, or to Ideas from its "···" menu (a bottom sheet on phones); on desktop, also drag it.
  - [ ] On a phone: one day per screen, swipe between days, and a day strip to jump straight to one; opens on today.
  - [ ] A 1 week / 2 weeks toggle; placing a dinner in next week creates next week with this week's budget, split, and store.
  - [ ] The shopping list follows the board: scheduled dinners add their ingredients (merged, priced as packages); moving or removing a dinner updates the list; paid and hand-added items are never touched; Ideas cost nothing.
  - [ ] The List has a This week / Next week switch, each with its own tally.
  - [ ] "Use this plan" puts dinners on open days from today (extras become Ideas); "Add to this week" keeps the dinners already there.

  - [ ] **Remove a whole plan** in one tap, from a dinner's menu on the Week board ("Remove this whole plan (3 dinners)") or "Remove plan" on the List's By plan heading, after a confirm. Unpaid items for those dinners leave the list; paid items stay. *(Added on submission day, at Tarik's request.)*
### My Pantry *(added in build, slice 4)*
- As Tarik, I want the crew to know what's already in my kitchen so that plans don't make me buy what I have.
  - [ ] A Pantry list of staples he has or is out of, remembered across weeks; the crew reads it when planning.
  - [ ] Pantry chips on the plan card let him mark a staple he's out of; it gets priced and added to the total.

### Shopping List and Prices
Source: `scope.md > The POC Boundary` (Kroger prices).
- As Tarik, I want a shopping list with real store prices so that I know what the plan should cost before I'm in the aisle.
  - [ ] Each row shows the item, its Kroger estimated price, and an empty actual-paid box.
  - [ ] If Kroger has no price, the row says "no price found" and Tarik can type an estimate.
  - [ ] **Send to my Pick 'n Save cart** *(added on submission day, at Tarik's request)*: he signs in at Kroger once per device and approves "add to cart"; unpaid items with a Kroger product go into his real Pick 'n Save / Metro Market pickup cart at their pack counts, and he checks out in the store's app. Kroger's public API can only add to the cart (it can't read the cart or orders), so the tally still comes from paid boxes and receipts.
  - [ ] When the brand picker's matches are wrong, he types his own search ("petite diced tomatoes") and picks from those; sale items show "was $X". Works for list rows and regulars. *(Added on submission day, at Tarik's request.)*
  - [ ] When the register matches the shelf price, one tap on **Matches** fills the paid box with the estimate (he can still type a different amount); the row then says "Right on the estimate." *(Added on submission day, at Tarik's request.)*
  - [ ] Tarik picks which nearby Pick 'n Save or Metro Market he's shopping at; prices come from that store, and switching stores re-prices the list (estimates he typed stay). *Added in build (slice 2) at Tarik's request: he shops at several stores.*
  - [ ] He can pick a different brand/size from Kroger's top matches, and set how many packages he's buying. *(Added in build, slice 2.)*
  - [ ] With two or more dinners planned, he can switch the list to **By dinner**: each dinner's ingredients under its own heading, items shared by several dinners shown once on top, and extras/regulars last; same rows and tally. *(Added in build after slice 9, at Tarik's request.)* A **By plan** option groups items by the plan they came from, with each plan's cost and a "Send this plan to Instacart" button; shared items show in each plan but are bought once. *(Added in final review.)*
  - [ ] *(Slice 10)* In the aisle he taps **Scan** and points the phone at a barcode: a packaged item is added with its Kroger price at his store (or flagged as already on the list); a store-printed meat/deli/produce sticker asks which row it is and fills in what he paid. He can type the numbers if the camera can't read it.
  - [ ] Each unpaid row also has its own **Scan**: a store sticker pays that row directly; the same product offers "Mark paid $X"; a different brand (say the sale one) switches that row to it instead of adding a duplicate. Scanning a product already on the list from the main Scan also offers "Mark paid". *(Added on submission day, at Tarik's request.)*
  - [ ] *(Slice 11)* **Send to Instacart** on the List opens Instacart with every unpaid item filled in (the exact product when he picked one), so he can pick a store and check out; a recipe can be sent the same way at the servings he chose. He types Instacart's prices into the paid boxes to keep the tally honest.
  - [ ] He can compare his unpaid list at two Pick 'n Save / Metro Market stores side by side: both totals, which is cheaper, the biggest differences, and what one store doesn't carry. *(Added after slice 11, at Tarik's request; Instacart stores can't be compared in the app because Instacart's API has no prices.)*
  - [ ] He can add a non-Kroger store (Sendik's, Whole Foods); while there, each row compares what he paid to the Kroger price. *(Added in build, slice 2.)*
  - [ ] Plan ingredients carry amounts, priced as the whole packages he'd buy. *(Added in build; delivered in slices 3–4.)*
  - [ ] **My Pantry:** a remembered list of staples he has or is out of; the crew reads it when planning, and pantry chips on the plan card let him mark anything he's out of so it's priced and added. *(Added in build, slice 4, at Tarik's request.)*

### Running Tally
Source: `scope.md > The Unique Kernel`.
- As Tarik, I want to see where I stand the moment I enter a price so that I can decide in the store.
  - [ ] Entering an actual price updates the tally at the top immediately: spent of budget, amount left, and days left.
  - [ ] A row turns one color when paid ≤ estimate and another when paid > estimate.
  - [ ] When total spent is below the budget, the tally clearly says he's under budget this week.
  - [ ] **Done shopping** *(added on submission day, at Tarik's request)*: after a trip he snaps the receipt; Claude reads the store, subtotal, tax, fees (delivery, bags, tip) and total; he checks and fixes them, then confirms (or types the total). The trip's receipt total then counts in the tally instead of the paid boxes it covers, so tax and fees are included; the List shows **Planned** (whole list), **Shelf** (paid boxes) and **Actual** (with receipts), and how the receipt compares to what was planned for the items on it. Undo removes a trip.
  - [ ] **Spending history** *(same day)*: weekly, monthly and quarterly totals of budget, planned and actual, with under/over. Linked from the List and Budget pages. The demo account has 12 sample past weeks, labelled "Sample".

## States and Boundaries
- **First use** — no budget yet: budget setup is shown before anything else.
- **Empty shopping list** — no plan yet: the list invites him to plan meals with the staff.
- **No Kroger price** — "no price found"; he can type an estimate.
- **Plan over budget** — the plan card shows it doesn't fit; he edits or chats to adjust.
- **Overspent** — paid > estimate: the row color-codes; if the week total passes the budget, the tally shows over budget (not just under).
- **Persistence** — *confirmed by Tarik:* budget, plan, list, and entered prices are still there when he closes and reopens it during the week. Needed for "what did I spend this week?" *Build:* planner chats are saved too (slice 5).
- **No store picked** — the plan card asks him to pick a store on the List first. *(Build, slice 2–3.)*
- **Kroger unreachable** — the chat says so and suggests trying again, instead of showing a $0 plan. *(Build, slice 3.)*
- **Recipe link can't be read** — the crew says so and asks him to paste the ingredients. *(Build, slice 5.)*
- **Week boundary** — *confirmed by Tarik:* a "week" is 7 days starting the day the budget is set; the tally resets after that.

## Product Decisions
- Staff suggests the budget (USDA-based) rather than asking cold — Tarik wanted a sensible starting point, with an override and an optional cooking-questions path.
- Shopping list with actual-paid boxes is the in-store surface, tally on top — matches how he'd use it in the aisle.
- Color-code paid vs. estimate — instant visual signal while shopping.
- One staff voice, not visibly separate agents — keeps the chat simple; the "crew" framing stays in personality, not multiple speakers.
- Typing, not voice, for now — simpler build; voice later.
- Recipe inspiration via pasted names/links now; YouTube playlist (public) later. *Build: links are now actually read and saved (slice 5); the playlist was brought back in as slice 9 at Tarik's request.*
- "No price found" + manual estimate now; web search fallback later — *drafted by Claude as later because it adds a third data source; Tarik can move it to now.*
- Playful, Duolingo-like look, designed with `/impeccable`.
- *Build decisions (Tarik):* store picker instead of one home store (he shops several stores); non-Kroger stores compared against Kroger; pick brand/size; My Pantry (full version); household sizing with a teen at 1½; recipe links with a recipe view and My Recipes shelf (reusing his Digero app's parsers); substitutes; saved chats like Claude; YouTube playlist sync with auto-tags and search (slice 9); barcode scanning (slice 10).
- *Build decisions (Claude, accepted):* Kroger searches one at a time with a progress bar (after a burst got the connection briefly blocked); Claude Haiku picks the right product by meaning; whole-package pricing ("cost to buy"); read playlist recipes on demand rather than all at once.

## What We're Building
- Budget setup with USDA-based suggestion, override, optional cooking questions.
- Planner chat (one voice) that asks dish type and number of days, uses pasted recipes, returns an editable, costed plan as interactive cards.
- Shopping list from the plan with Kroger estimated prices and actual-paid boxes.
- Running tally (spent / budget / left / days left) with color-coded rows and an under-budget signal.
- *Added in build:* store picker and brand choice; household sizing; My Pantry; recipe links, recipe view, and My Recipes; substitutes; saved chats; "Add to this week".
- *Added in build (slice 6):* Regulars and a Dinners/Extras budget split.
- *Added in build (slice 7):* the Market Stall design and the Mise name.
- *Added in build (slice 8):* the Kanban week board with real two-week planning.
- *Planned in build order:* YouTube playlist sync with tags and search (9), barcode scanning (10), **Instacart: send the list to Instacart** (11, final; reopens the deferred Instacart integration at Tarik's request).

## Deferred From the POC
- ~~**YouTube playlist import**~~ — *brought back in during the build as slice 9 at Tarik's request (official YouTube API).*
- **Web search for missing prices** — third data source; manual estimate covers it.
- **Voice input** — nicer in the aisle, but an extra piece.
- ~~**Receipt photo logging**~~ — built on submission day as "Done shopping" (see Running Tally).
- ~~**Instacart integration**~~ — *brought back in during the build as the final slice (11) at Tarik's request.*

## Possible Later Enhancements
- More savings comparisons (vs. delivery, vs. usual spending) and a savings running total.
- Full Sunday-planning flow for the whole week.
- Visibly separate staff roles (budget keeper, meal planner, price checker).
- *From the build:* shopping **trips** (one weekly list split into tabs by store, e.g. Metro / Sendik's / Instacart, sharing one weekly tally); recipe folders/collections, ratings, and cook history; cook mode; true vector (meaning-based) search, which needs an embeddings provider; automatic scheduled playlist sync; price history across stores.

## Non-Goals
- **Bank connection (Plaid)** — credentials and security work far beyond the PoC (cut in scope).
- **Grubhub / Uber Eats / coupon hunting** — no practical data access (cut in scope). Kroger's API has no coupon or weekly-ad data either; its *sale prices* are shown (see Meal Planning Chat).
- **Multiple users or accounts** — it's for Tarik's own household.

## Open Questions
- ~~**Project name**~~ — *decided in build (slice 7): **Mise** (from mise en place), chosen by Tarik; "Kitchen Crew" was the working name. The assistant stays "the crew".*
- ~~Persistence and week-boundary assumptions~~ — confirmed at PRD approval.
