# Plan: Pantry Box mode and Classroom mode (for food banks like Hunger Task Force)

Status: **proposed, not built** (drafted Oct 26, 2026). Built pieces it reuses: barcode scanner, receipt photo reading,
pantry, the crew's planner, SNAP math, food-help directory.

## 1. Pantry Box mode — "I got a food box; plan my week around it"

**Who:** a family that just picked up a box from a pantry (often shelf-stable USDA foods: canned vegetables and fruit,
canned chicken or tuna, beans, rice, pasta, peanut butter, cereal, shelf-stable milk).

**What happens, in order**
1. Pantry page (or the chat: "I got a food box") → **"Add my food box"**.
2. Add what's in it, whichever is easiest:
   - **Snap one photo of the box contents** → Claude lists the items (same pattern as receipt reading), the person fixes the list.
   - **Scan barcodes** one by one (the existing scanner, in "add to pantry" mode).
   - **Tick a quick checklist** of common pantry-box items.
3. Items join the pantry, tagged "from the box", with counts (2 cans of green beans).
4. **"Plan the week around my box"** → the crew plans dinners that use the box first and buys only the gaps; the plan
   card shows **From your box: 9 items · To buy: 6 items, $18.40**, split SNAP / cash for SNAP households.
5. As dinners are cooked, box items are used up (the pantry count goes down).

**Build steps (≈ 5–6 hours)**
| Step | Work | Reuses |
|---|---|---|
| A | Pantry counts + "from the box" tag (schema: `qty`, `source`) | pantry table |
| B | Photo → item list (`app/api/pantry/photo`, Claude vision, confirm screen) | receipt route |
| C | Scanner "add to pantry" mode | BarcodeScanner `forItem` pattern |
| D | Quick checklist of ~25 common box items | — |
| E | Crew rule + plan card "from your box / to buy" line | staff prompt, `pricePlan` |
| F | Tests (count math, merge duplicates) + a Demo walkthrough | — |

**How we'll know it works:** a real box photographed → a 5-day plan where most dinners use box items and the buy list
stays under the SNAP weekly share.

## 2. Classroom mode — nutrition and budgeting classes

**Who:** food-bank staff or volunteers teaching "eat well on a SNAP budget"; learners on phones.

**What happens**
1. Instructor creates a **class** with a practice household and budget (e.g., family of 4, SNAP $1,023/month ≈ $236/week) and gets a **join code**.
2. Learners join with the code and get a **practice week** (separate from any real week; resets anytime).
3. They plan with the crew, build the list, "shop" it (Matches / typed prices), see the tally go green or orange.
4. Instructor view: **how each table did** (planned vs budget, % from sales, % SNAP-eligible), no names by default.

**Build steps (≈ 1.5–2 days)**
| Step | Work |
|---|---|
| A | `classes` + `practiceWeeks` tables, join codes, instructor role |
| B | Practice week that never touches the learner's real tally or history |
| C | Guest join without full sign-up (Clerk guest or one-time code), auto-expire after the class |
| D | Instructor dashboard (aggregate only) |
| E | Spanish (and Hmong for Milwaukee) for the main screens |
| F | Privacy review: what an instructor can see; data deletion after the class |

**Before building:** talk to Hunger Task Force (or the class partner) about what they teach today, devices learners
have, languages, and whether guest access is acceptable. Classroom mode only makes sense with a partner.

## Recommended order
1. Pantry Box mode first: useful to any family on its own, small, mostly reuse.
2. Talk to a food bank, then Classroom mode shaped by what they actually teach.

## Open questions for Tarik
- Pantry Box: photo first, or scan first? (Photo is faster for a whole box; scanning is more exact.)
- Classroom: do you have a contact at Hunger Task Force or another partner to validate it with?
- Language: is Spanish worth doing before either mode?

## What actually happened
(Tarik fills this in later.)
