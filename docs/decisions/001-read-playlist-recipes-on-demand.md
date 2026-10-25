# 001 — Read playlist recipes on demand, written recipe first

**Decision** — Syncing the YouTube playlist saves only each video's title and thumbnail; a recipe is read the first time it's opened or planned, from the channel's written recipe when one is linked, and from the video itself otherwise.

**Why this came up** — The "recipes" playlist has 86 videos. Reading a recipe means fetching pages and asking Claude to pull out ingredients and steps, about 10–20 seconds and a few cents each. Done wrong, syncing either takes many minutes or fills the shelf with recipes guessed from what a chef says out loud, when the exact amounts were one link away.

**Options**
1. **Read everything at sync.** The whole shelf is ready at once. Cost: ~86 Claude calls and a long wait on the first sync, mostly for recipes that may never be cooked.
2. **Read on demand, transcript only.** Fast sync, simple. Cost: amounts are guessed from speech even when the channel published a written recipe.
3. **Read on demand, written recipe first** (chosen). Check the video description for a recipe link, read that page; if the site blocks plain fetching, TinyFish (a service that loads a page like a real browser) renders it; only then fall back to the transcript. Cost: more moving parts, and a 10–20 second wait the first time a recipe is opened.

**What we chose and why** — Option 3. Joint call: Tarik asked for on-demand reading and TinyFish as a fallback; Claude proposed checking description links first after finding that 49 of the 86 videos link a written recipe.

**What we gave up** — The first open of each recipe makes you wait. Some sites block even TinyFish (The Woks of Life), so those recipes still come from the transcript. The link filter is a set of rules tuned on today's descriptions; a channel that formats its links differently could be missed.

**How we'll know if this was right** — Recipes opened from the playlist show amounts that match the channel's written recipe; reading rarely fails; the wait on first open doesn't stop Tarik from using playlist recipes in plans.

**What actually happened** —
