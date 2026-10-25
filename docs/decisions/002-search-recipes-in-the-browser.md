# 002 — Search My Recipes in the browser, with tags from a fixed list

**Decision** — The My Recipes search box and tag chips filter the shelf right in the browser, and Claude tags recipes only from a fixed list of about 50 tags.

**Why this came up** — The plan said "Convex text search", which is a search index (a lookup table the database keeps so it can find words without reading every recipe). With 86 recipes on the shelf, the question was whether that machinery earns its keep. Separately, letting Claude invent any tag would make the chips messy ("chicken", "Chicken", "poultry").

**Options**
1. **Convex search index.** Scales to thousands of recipes and ranks results. Cost: a combined text field kept in sync on every save, and a round trip to the database on each keystroke, for a shelf of under 100.
2. **Filter in the browser** (chosen). The shelf already loads every recipe, so matching typed words against titles, ingredients, tags and channel is instant. Cost: it slows down if the shelf ever grows to thousands, and there's no typo tolerance.
3. **Meaning-based (vector) search.** Finds "cozy" without the word being there. Cost: needs an embeddings service (a way to turn text into numbers that capture meaning) and stays on the Later list.

**What we chose and why** — Option 2, plus a fixed tag list for auto-tags. Claude's call, flagged to Tarik: it matches the shelf's real size, and mood requests ("something cozy") already work by asking the crew, which sees every title and its tags.

**What we gave up** — Typos don't match ("chiken"), results aren't ranked, and Claude can't make up a useful new tag on its own (Tarik can add his own words to any recipe).

**How we'll know if this was right** — Searching and tapping chips feels instant on the phone; the chips are the ones Tarik actually reaches for; the shelf stays well under ~1,000 recipes. If it passes that, move to option 1.

**What actually happened** —
