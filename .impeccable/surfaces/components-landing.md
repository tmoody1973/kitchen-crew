---
version: 1
slug: "components-landing"
primary_target: "components/landing"
related_targets: ["app/page.tsx"]
---

# Landing page (`/`, signed out)

Scope: the public front door at `/` for signed-out visitors; signed-in people still go straight into the app. Mode: **Persuade**.

Audience and job: Devpost hackathon judges and curious visitors. They should understand in one screen that Mise keeps a family's weekly groceries under budget while they eat well, and then watch the demo. Secondary action: the GitHub repo. Sign-in stays for the household (strangers would spend the household's Claude/Kroger usage).

Proof: real Mise screens captured from a demo account's sample week (no personal data), labeled "Sample week". No testimonials, users, or metrics beyond what the product truly does.

Constraints: inside the Market Stall world (DESIGN.md). Phone and laptop. Demo video URL doesn't exist yet: a single constant to swap.

## Direction contract

THESIS: Mise is a market you walk: every stall sells one part of the week (the tally, the crew, the board, the list, the recipe shelf). Refuses the category's phone-and-laptop showcase with a feature grid of icon cards.

OWN-WORLD: Market Stall, unchanged: cream ground, slate chalkboard boards with flip-cell numerals, yellow shelf tags for prices, tomato signs in Bowlby One, Figtree body, kale/squash only for under/over meaning, crate-wood edges. Stall headings hang like painted stall signs under a narrow awning edge.

STORY: The visitor sees the outcome (under budget, good dinners), watches the tally prove it, walks five stalls that each show a real screen doing its job, and leaves with "Watch the demo" (or GitHub).

FIRST VIEWPORT: Laptop: the Mise market sign across the top; left 7/12 the headline "Stay under budget. Eat well." with one sentence and the two actions (Watch the demo primary, GitHub secondary); right 5/12 the first stall, a live chalkboard tally whose numerals flip upward as sample list rows tick paid, settling on "under budget this week". Phone: sign, headline, actions, then the tally stall immediately below, actions above the fold.

FORM: Walk the market, #5 on the ranked list of seven structures, dealt as the roll's lead. Seed key e0944fd7. Signature interaction: the tally board counts a sample week's paid rows once, then rests.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
