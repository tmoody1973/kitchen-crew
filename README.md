# Mise

Mise keeps a family's weekly grocery spending under budget. You set a weekly budget, plan dinners in a chat with a "kitchen crew" (Claude), and every ingredient is priced at your own Kroger-family store (Pick 'n Save or Metro Market) before you commit. The plan becomes a week board and a shopping list, and a live tally tracks what you actually pay as you shop.

**Live:** https://mise-weld.vercel.app (sign-in required past the landing page; a demo login is provided to judges privately).

Built for the Devpost **Build With AI: Basics** hackathon with the Devpost Learn Skill Pack. The planning documents are in [`devpost/`](devpost/).

## What it does

- **Budget:** a suggested weekly budget from USDA food-cost data, an optional Dinners / Extras split, and household servings.
- **Planner chat:** the crew plans dinners from your saved recipes and pantry, sized for your household. Results come back as cards: a priced meal plan, a "fits your budget" check, recipe cards. Kroger prices are looked up one item at a time with a progress bar.
- **Week board:** dinners on days (one or two weeks), an Ideas column, move or remove a dinner and the shopping list rebuilds.
- **Shopping list:** shelf price per row, a paid box, rows turn green or orange with a sentence saying which; brand/size picker; views by item, by dinner, or by plan; compare the list at two Kroger stores; scan a barcode; send unpaid items to Instacart.
- **Recipes:** paste a website or YouTube link (in the chat or on My Recipes), ask the crew to search the web for recipes (TinyFish) and add them from the chat, or sync a YouTube playlist. Each recipe is read the first time it's opened (the channel's written recipe first, then the video), auto-tagged, searchable, scaled to your servings, US or metric.
- **Kroger sales:** plans show "Includes $X in Kroger sales" and tag sale items; ask the crew "what's on sale?" for your list, your regulars, or the ingredients your saved recipes use most. (Kroger's API has sale prices, not coupons.)
- **Done shopping:** snap the receipt; Claude reads the subtotal, tax, fees and total, you confirm, and the tally counts the real total. Planned vs shelf vs actual for the week, and a spending history by week, month and quarter.
- **The money math is plain code.** Totals come from real prices and arithmetic in [`lib/tally.ts`](lib/tally.ts); the AI picks dinners and products but never adds up the bill.

## Stack

Next.js 15 (App Router), React 19, Tailwind CSS 4, Convex (database and server functions), Clerk (sign-in), Vercel AI SDK with Claude (Sonnet for the crew, Haiku for product picks and tags), Kroger Public API, YouTube Data API v3, TinyFish (fallback page reader), Instacart Developer Platform, `barcode-detector` (ZXing in WebAssembly). Tests: Vitest.

## Run it locally

You need Node.js 20+ and accounts for the services below (all have free developer tiers).

| Service | What for | Where to get keys |
|---|---|---|
| Convex | database and server functions | https://convex.dev (created by `npx convex dev`) |
| Clerk | sign-in | https://clerk.com: create an application and a JWT template named `convex` |
| Anthropic | the crew, recipe reading, tags | https://console.anthropic.com |
| Kroger | store list and prices; "Send to my cart" | https://developer.kroger.com: a client with the `product.compact` and `cart.basic:write` scopes, and redirect URI `<your-site>/api/kroger/callback` |
| YouTube Data API v3 | recipe videos and playlist sync | Google Cloud console |
| TinyFish *(optional)* | reading recipe sites that block plain fetching | https://tinyfish.ai |
| Instacart *(optional)* | "Send to Instacart" | Instacart Developer Platform (a development key opens Instacart's sandbox store) |

1. Install: `npm install`
2. Copy the env template and fill it in: `cp .env.example .env.local`
   - `KROGER_ZIP` is the ZIP code whose nearby Pick 'n Save / Metro Market stores appear in the store picker.
   - `YOUTUBE_PLAYLIST_ID` is the `list=` part of the playlist link that "Sync my playlist" reads.
   - `INSTACART_API_BASE` is optional; it defaults to Instacart's development server. Set it to `https://connect.instacart.com` with a production key.
3. Tell Convex to trust your Clerk sign-ins: `npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<your-app>.clerk.accounts.dev`
4. Start the website and Convex together: `npm run dev`, then open http://localhost:3000.

Never commit `.env.local`; it is git-ignored.

## Checks

```bash
npm run typecheck   # TypeScript
npm test            # Vitest unit tests (tally, plan pricing, quantities, barcodes, recipe parsing, grouping, …)
npm run build       # production build
```

## Where things live

- `app/` — pages (Plan, Week, List, Pantry, Recipes, Budget, the landing page at `/`) and server routes in `app/api/`
- `convex/` — database schema and functions (weeks, list items, dinners, recipes, pantry, chats)
- `lib/` — plain logic: the tally (`tally.ts`), plan pricing (`meal-plan.ts`), Kroger client (`kroger.ts`), barcodes (`barcode.ts`), Instacart (`instacart.ts`), recipe import (`recipes/`)
- `components/` — screens' building blocks and the chat's cards
- `devpost/` — scope, PRD, spec, build checklist, and `app-map.html` (a guide to the code)
- `docs/decisions/` — decision records written during the build
- `DESIGN.md` — the visual system ("Market Stall")

## Demo account

Judges sign in to a demo account with a labelled sample week (credentials are shared privately, never in this repo). To put it back to its saved state after people have used it: `./scripts/demo-reset.sh` (needs Convex admin access and the local, git-ignored snapshot; `convex/demo.ts` holds the internal snapshot/restore functions, which the app cannot call).

## Known limits

- Prices come only from Kroger-family stores (Pick 'n Save, Metro Market) near `KROGER_ZIP`; other stores can be named, with prices typed in by hand.
- "Send to Instacart" uses a development key, which opens Instacart's sandbox store (real catalog and prices, no real orders). Packaged items arrive there as quantity 1.
- The barcode camera needs a secure (https) address on a phone; typed barcode entry works anywhere.
- Recipes read from videos and pages by Claude can contain mistakes; each recipe links back to its source.

## Credits and disclosures

- **Pre-existing code reused from the author's own earlier app, Digero:** the recipe parsers (`lib/recipes/parseJsonLdRecipe.ts`, `parseMicrodataRecipe.ts`, `recipeTypes.ts`), the YouTube URL parser and transcript approach (`lib/recipes/youtubeUrlParser.ts`, `youtube.ts`), the Instacart unit-mapping approach (`lib/instacart.ts`), and the recipe list/view layout. Each file notes its origin.
- **Third-party data and media:** prices and product photos from the Kroger API; video titles, thumbnails, and descriptions from the YouTube Data API (credited to their channels in the app); recipes belong to their creators and link back to the original video or page.
- AI coding assistance: built with Claude Code following the Devpost Learn Skill Pack.
