# 004 — The crew talks about sales, but only repeats numbers code computed

**Decision** — Sale prices reach the planner through code-drawn cards (the Meal Plan card's "Includes $X in Kroger sales" line and a new Sales card); the crew (Claude) may mention sales but only repeats savings those cards show.

**Why this came up** — Tarik asked how to show sale prices while planning and wanted all three options: tags on the cards, the crew favouring sale items, and the crew talking about sales. Mise's core promise is "the AI picks, plain code does the money math." A crew that types "$0.80 off" from memory could get a number wrong in front of a judge, and break that promise.

**Options**
1. **Cards only.** Sale tags drawn by code; the crew never mentions sales. Safest, but you can't ask "what's on sale?"
2. **The crew states sale prices in its reply.** Most conversational. Cost: a language model (an AI that writes text) can misstate a number, and nothing checks it.
3. **A sales tool plus cards (chosen).** The crew calls `findSales`, a function that asks Kroger and computes each saving in code; a Sales card shows the result, and the crew is told to repeat only those numbers.

**What we chose and why** — Option 3. Tarik picked "all three" (A, B, C) and asking the crew; Claude proposed routing C through a tool so the conversation stays but the numbers come from code.

**What we gave up** — The crew's words are still model output: nothing mechanically stops it from rewording a saving, only its instructions. "Recipes" checks just the 12 most-used ingredients (more would mean slow, one-at-a-time Kroger searches), and matching is by words, so "garlic" can find minced garlic in a jar. Kroger has no coupons API, so clip-to-card coupons aren't included.

**How we'll know if this was right** — In test chats the crew's stated savings match the card to the cent (first check, Oct 26: $1.00 and $0.11, matched). If Tarik finds a mismatch, move the crew's sale sentence onto the card itself.

**What actually happened** —
