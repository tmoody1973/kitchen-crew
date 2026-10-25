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

## Screens and Layout
- **Budget setup** — first-use only: suggested weekly budget, a field to change it, optional "help me figure it out" questions.
- **Planner chat** — conversation with the staff; replies come back as interactive cards (meal plan, budget fit) rather than plain paragraphs, per `scope.md > Inspiration & Identity` (generative UI). The plan is editable in place.
- **Shopping list** — tally pinned at the top; list rows below (item · Kroger estimate · actual-paid box).
- Movement: setup → planner → shopping list; the tally is visible wherever spending is shown. Exact navigation is left to `4-spec`/build.

## Look and Feel
- **Vibe:** playful, Duolingo-like — friendly, encouraging, game-ish energy; bright and bold rather than a sober finance app.
- **Design process:** visual design will be produced with the `/impeccable` skill during `5-build`, using this vibe as its brief.
- **Color carries meaning:** price rows color-code (paid ≤ estimate vs. paid > estimate); the tally signals under/over budget.
- Not established: specific fonts, palette, or mascot/character. Leave to `/impeccable`.

## Features and Behavior

### Budget Setup
Source: `scope.md > The POC Boundary` (USDA-seeded budget).
- As Tarik, I want a sensible starting budget suggested for me so that I don't have to guess.
  - [ ] On first open, a suggested weekly amount for a family of three appears, labeled as based on USDA food-cost data.
  - [ ] Tarik can replace it with his own number, and the tally uses whichever he chose.
  - [ ] An optional path asks a few questions about what he likes to cook and returns an adjusted suggestion.

### Meal Planning Chat
Source: `scope.md > The Core Loop`.
- As Tarik, I want the staff to help me decide what to cook for the next few days so that I plan ahead instead of improvising in the store.
  - [ ] Asking for a plan, the staff first asks what kind of dishes he wants, then how many days.
  - [ ] Pasted recipe names/links are used as inspiration in the plan.
  - [ ] The plan shows each meal with an estimated cost and whether the total fits the remaining budget.
  - [ ] Answers appear as interactive cards, not just text.
  - [ ] Tarik can change a meal by editing the plan or by asking in chat; costs and budget fit update.

### Shopping List and Prices
Source: `scope.md > The POC Boundary` (Kroger prices).
- As Tarik, I want a shopping list with real store prices so that I know what the plan should cost before I'm in the aisle.
  - [ ] Each row shows the item, its Kroger estimated price, and an empty actual-paid box.
  - [ ] If Kroger has no price, the row says "no price found" and Tarik can type an estimate.

### Running Tally
Source: `scope.md > The Unique Kernel`.
- As Tarik, I want to see where I stand the moment I enter a price so that I can decide in the store.
  - [ ] Entering an actual price updates the tally at the top immediately: spent of budget, amount left, and days left.
  - [ ] A row turns one color when paid ≤ estimate and another when paid > estimate.
  - [ ] When total spent is below the budget, the tally clearly says he's under budget this week.

## States and Boundaries
- **First use** — no budget yet: budget setup is shown before anything else.
- **Empty shopping list** — no plan yet: the list invites him to plan meals with the staff.
- **No Kroger price** — "no price found"; he can type an estimate.
- **Plan over budget** — the plan card shows it doesn't fit; he edits or chats to adjust.
- **Overspent** — paid > estimate: the row color-codes; if the week total passes the budget, the tally shows over budget (not just under).
- **Persistence** — *confirmed by Tarik:* budget, plan, list, and entered prices are still there when he closes and reopens it during the week. Needed for "what did I spend this week?"
- **Week boundary** — *confirmed by Tarik:* a "week" is 7 days starting the day the budget is set; the tally resets after that.

## Product Decisions
- Staff suggests the budget (USDA-based) rather than asking cold — Tarik wanted a sensible starting point, with an override and an optional cooking-questions path.
- Shopping list with actual-paid boxes is the in-store surface, tally on top — matches how he'd use it in the aisle.
- Color-code paid vs. estimate — instant visual signal while shopping.
- One staff voice, not visibly separate agents — keeps the chat simple; the "crew" framing stays in personality, not multiple speakers.
- Typing, not voice, for now — simpler build; voice later.
- Recipe inspiration via pasted names/links now; YouTube playlist (public) later.
- "No price found" + manual estimate now; web search fallback later — *drafted by Claude as later because it adds a third data source; Tarik can move it to now.*
- Playful, Duolingo-like look, designed with `/impeccable`.

## What We're Building
- Budget setup with USDA-based suggestion, override, optional cooking questions.
- Planner chat (one voice) that asks dish type and number of days, uses pasted recipes, returns an editable, costed plan as interactive cards.
- Shopping list from the plan with Kroger estimated prices and actual-paid boxes.
- Running tally (spent / budget / left / days left) with color-coded rows and an under-budget signal.

## Deferred From the POC
- **YouTube playlist import** — second outside service (Google API); pasting recipes covers the demo.
- **Web search for missing prices** — third data source; manual estimate covers it.
- **Voice input** — nicer in the aisle, but an extra piece.
- **Receipt photo logging** — second way to enter spending (from scope).
- **Instacart integration** — access exists but coverage unchecked (from scope).

## Possible Later Enhancements
- More savings comparisons (vs. delivery, vs. usual spending) and a savings running total.
- Full Sunday-planning flow for the whole week.
- Visibly separate staff roles (budget keeper, meal planner, price checker).

## Non-Goals
- **Bank connection (Plaid)** — credentials and security work far beyond the PoC (cut in scope).
- **Grubhub / Uber Eats / coupon hunting** — no practical data access (cut in scope).
- **Multiple users or accounts** — it's for Tarik's own household.

## Open Questions
- **Project name** — "Kitchen Crew" is a working name; can change anytime (doesn't block `4-spec`).
- ~~Persistence and week-boundary assumptions~~ — confirmed at PRD approval.
