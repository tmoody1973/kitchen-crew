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

- [ ] **2. Add an item, get its real Kroger price, type what you paid, and watch the tally move**
  Becomes usable: On the Shopping List you add "chicken thighs," it fills in the Kroger price at your home store (or "no price found" with an editable estimate), you type what you paid, the row turns green or orange, and the tally updates instantly.
  Why now: The kernel moment ("$58 left for 4 days"), plus the biggest unverified risk, the Kroger API, proven before any AI depends on it.
  PRD ref: `prd.md > Shopping List and Prices`, `prd.md > Running Tally`, `prd.md > States and Boundaries` (No Kroger price, Overspent, Empty shopping list)
  Spec ref: `spec.md > Kroger Client (lib/kroger.ts)`, `spec.md > Kroger Public API`, `spec.md > Shopping List Screen`, `spec.md > Tally Header and Budget Math (lib/tally.ts)`, `spec.md > Important Failure Modes`
  Build: First a small probe script that gets a Kroger token, finds the store from `KROGER_ZIP`, and prints the price for one item, correcting the spec if the API differs. Then `lib/kroger.ts` (token cache, store lookup, price search) behind a server route, Convex `listItems` functions, the Shopping List screen with `ListRow`, color states, and a manual add-item box (temporary until slice 4 fills the list from a plan).
  Verify (mechanical): Probe script prints a real price for a common item at the home store; tests pass and cover a paid entry updating spent/left; `npm run build` succeeds; `npx convex run` sets a paid amount and the list query returns the updated tally inputs.
  Learner check: Add "chicken thighs" and "eggs." Check that the prices look like what your store charges. Type a paid amount above one estimate and below the other: one row green, one orange, tally updated with no reload.
  Commit: `feat: Kroger-priced shopping list with live tally`

- [ ] **3. Ask the crew what to cook and get a costed meal plan card**
  Becomes usable: In the Planner chat you ask "what should we cook?" The crew asks what kind of dishes (you can paste recipe names or links), then how many days, and answers with a Meal Plan card (meals, Kroger-priced costs) and a Budget Fit card ("fits" / "over by $X").
  Why now: The generated-UI half of the kernel; it builds directly on the Kroger client and tally math that slice 2 proved.
  PRD ref: `prd.md > Meal Planning Chat`, `prd.md > The Core Journey` (steps 2–3), `prd.md > Screens and Layout`
  Spec ref: `spec.md > Planner Chat`, `spec.md > Chat Route and the Staff's Tools (app/api/chat/route.ts)`, `spec.md > Cards (components/cards/)`, `spec.md > Claude via Anthropic API`, `spec.md > Important Failure Modes`
  Build: `lib/staff-prompt.ts` (one playful voice; asks dish type first, then days); chat route with sign-in check and the `proposeMealPlan` tool (Claude lists meals and ingredients; code prices via Kroger, totals, compares to remaining budget, validates shape); Planner chat screen mapping tool results to `MealPlanCard` and `BudgetFit`; thinking and error states.
  Verify (mechanical): `npm run build` succeeds; a scripted request to the chat route (signed-in test) returns a `proposeMealPlan` result whose totals equal the sum of its item prices; a malformed-plan unit test triggers the retry/"try again" path; tests pass.
  Learner check: Ask for 3 days of dinners and paste one recipe you like. Check that the crew asks dish type before days, that the card shows real-looking costs, and that the budget fit matches your remaining budget.
  Commit: `feat: meal planning chat with costed plan cards`

- [ ] **4. Adjust the plan, use it, and shop from the list it makes**
  Becomes usable: Remove a meal on the card or ask the crew to swap one; the costs and budget fit update. Tap "Use this plan" and the Shopping List fills with the plan's ingredients (duplicates merged), each with its Kroger estimate. The optional "help me figure it out" budget chat returns a Budget Card you can use.
  Why now: Closes the core journey from plan to list to under budget, the full demo path.
  PRD ref: `prd.md > The Core Journey` (steps 4–7), `prd.md > Meal Planning Chat`, `prd.md > Budget Setup`, `prd.md > States and Boundaries` (Plan over budget)
  Spec ref: `spec.md > Cards (components/cards/)`, `spec.md > Chat Route and the Staff's Tools (app/api/chat/route.ts)`, `spec.md > Data Model`, `spec.md > Shopping List Screen`
  Build: Remove-meal on `MealPlanCard` (recompute totals in code); swap via chat; "Use this plan" Convex mutation in `convex/plans.ts` (save meals, merge ingredients into listItems, replace any prior plan); `suggestBudget` tool + `BudgetCard` wired to the Budget Setup "help me figure it out" link; remove the temporary manual add-item box only if the learner agrees (otherwise keep it).
  Verify (mechanical): Tests for ingredient merging and remove-meal totals pass; `npx convex run` on the plan mutation creates the expected meals and merged listItems; `npm run build` succeeds.
  Learner check: Plan 3 days, remove one meal, ask the crew to swap another, then tap "Use this plan." Open the Shopping List, enter a few paid prices, and confirm the tally ends "under budget this week."
  Commit: `feat: adjustable plans that become your shopping list`

- [ ] **5. Make it feel like Kitchen Crew: playful design and phone-ready list**
  Becomes usable: All screens get the playful, Duolingo-like look, with a one-handed phone layout for the Shopping List (big tap targets, number keypad, tally always visible) and friendly empty and error states.
  Why now: Design is applied once the screens exist and their behavior is settled, so `/impeccable` styles the real thing instead of guesses.
  PRD ref: `prd.md > Look and Feel`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Look and Feel`, `spec.md > Important Failure Modes`
  Build: Run `/impeccable` across Budget Setup, Planner chat and cards, and Shopping List using the Look and Feel brief; ensure color is always paired with text; phone-width layout; copy for empty list, no price, crew error.
  Verify (mechanical): `npm run build` succeeds; tests pass; `/impeccable` verification pass at phone and desktop widths with screenshots reviewed and defects fixed.
  Learner check: Open the app on your phone's browser (same Wi-Fi, laptop's local address) or a narrow window. Walk the store moment: does it feel playful, and can you enter prices one-handed?
  Commit: `feat: playful design and phone-ready shopping list`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 2 (real Kroger prices + live tally), before the AI chat is built on top
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
