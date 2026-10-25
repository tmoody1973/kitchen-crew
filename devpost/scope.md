---
doc: scope
status: approved
---

# Kitchen Crew (working name)

A small "staff" of AI agents that keeps a family of three's food spending under a weekly budget, answering with live screens instead of paragraphs.

## The Unique Kernel
You tell it what you're buying in plain words — "chicken thighs, $11" — and your kitchen staff answers with where you stand: "that puts you at $142 of $200 this week, and you've got $58 left for 4 days," plus what you can still cook with what's left, priced at real Kroger prices. Budget tracking, meal planning, and real prices in one conversation, run like a team you manage rather than a spreadsheet you maintain.

## Who It's For
Tarik, cooking for a family of three. Loves to cook, but spends more on food than he'd like and rarely plans more than a day or two ahead. Today the money leaks out in the store, on Tuesday-night delivery orders, and through Instacart, with no running sense of where the week stands.

## The Core Loop
Set a weekly budget once. Then, standing in the store (the moment that matters most), say what you're buying and the price. The staff updates the tally, shows how much is left for the remaining days, and adjusts the next few days' meals to fit. Come back every shopping trip, because it's the only place that knows "what did I spend this week?"

## Inspiration & Identity
- **Paperclip** (https://paperclip.ing/) — the company/roles framing: "a company you are running, not a tool you are using." Here: a household staff (e.g. budget keeper, meal planner, price checker) that you direct.
- **OpenUI** (https://www.openui.com/) — generative UI: the AI responds with interactive screens (tally cards, meal plans) built from your request, not just text.

## Why This Matters to the Learner
"I love to cook, but I seem to spend a lot of money on food, more than I like. I want to be smarter about grocery shopping and stick to a budget." Built mostly for himself, as an experiment.

## What "Working" Looks Like
In a one-minute demo: start with a weekly budget for a family of three (seeded from USDA food-cost data, adjusted for current prices), have the staff plan a few days of meals costed with real Kroger prices, log a couple of in-store purchases in plain words, and watch the running total update. The "oh, that's cool" beat: "chicken thighs, $11" → "$142 of $200, $58 left for 4 days — you're under budget this week," with the screen rebuilding itself around the answer.

## The POC Boundary
- Weekly budget, seeded from a USDA family-of-three food plan.
- Logging purchases by typing them in plain words.
- Running tally against the budget; the one savings number is **under budget this week**.
- A few days of meals planned to fit the remaining budget, priced via the Kroger API.
- Agents as named roles, with answers shown as generated UI rather than plain text.

## Later
- Snapping a receipt photo to log spending.
- More savings comparisons (vs. ordering delivery, vs. usual spending) and a running total of savings over time.
- Instacart integration (learner has developer access; what it covers is not yet checked).
- Planning further ahead (full Sunday-planning flow).

## Explicitly Cut
- **Plaid / connecting a real bank account** — real bank credentials, account approval, and security work; far beyond a 2–4 hour build.
- **Grubhub / Uber Eats data and coupon hunting** — no easy data access for a hobby project; would mean hand-pasting numbers anyway.

## Open Risk
This boundary is ambitious for 2–4 hours: Kroger setup, meal planning, agent roles, and generated UI all sit in "now." `4-spec` should sequence the plain budget-and-tally loop first so there is a working demo even if later pieces slip.
