# 003 — Compare store prices with Kroger's API, not Instacart's

**Decision** — "Compare stores" prices the list at two Pick 'n Save / Metro Market stores through Kroger's official API; Instacart stores aren't compared inside the app.

**Why this came up** — Tarik asked to search ingredients across Instacart stores to compare prices. Instacart reaches 24 stores near his ZIP (ALDI, Costco, Meijer, Festival, Woodman's…), so a comparison there would cover far more than Kroger's two chains.

**Options**
1. **Instacart's API.** Checked first: it only creates shopping-list and recipe pages and lists nearby stores by name. It returns no prices, so there's nothing to compare.
2. **A bot that reads Instacart's pages** (switch store, read each price). Cost: several minutes per store, breaks whenever Instacart changes its page, likely against Instacart's terms (not yet read), and only the sandbox works with the current key.
3. **Kroger's API for two stores** (chosen). Official, already used for every price in the app, and it can price the exact same product at both stores. Cost: only Pick 'n Save and Metro Market.

**What we chose and why** — Option 3. Tarik picked it from the three; Claude recommended it after confirming Instacart's API has no price data.

**What we gave up** — ALDI, Costco, Meijer and the other Instacart stores can't be compared in the app; Tarik can still switch stores by hand on the Instacart page the app opens. Items without a chosen product are matched by name, so the two stores may be pricing slightly different products.

**How we'll know if this was right** — Tarik uses the comparison when deciding which store to go to, and the listed differences match the shelf. If he keeps wanting ALDI or Costco in the comparison, revisit with a real price source for them.

**What actually happened** —
