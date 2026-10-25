---
name: Mise
description: A farmers-market stall for a family's weekly grocery budget. Chalkboard tally, shelf-tag prices, crate stamps for verdicts.
colors:
  tomato: "#d33722"
  tomato-dark: "#a82b1b"
  tag: "#ffd23f"
  slate: "#1f2a24"
  slate-cell: "#3a4a41"
  chalk: "#f4f1e8"
  chalk-dim: "#b9c4bc"
  chalk-line: "#9fb3a6"
  crate: "#6b4f2e"
  kale: "#2e8b3e"
  kale-ink: "#1f6b2c"
  kale-wash: "#eef7ea"
  squash: "#f26b1d"
  squash-ink: "#a8430c"
  squash-wash: "#fff1e6"
  ground: "#fbf8f1"
  paper: "#ffffff"
  ink: "#1d241f"
  ink-soft: "#5b5346"
  line: "#e9e1d2"
  placeholder: "#766d5f"
typography:
  display:
    fontFamily: "Bowlby One, Figtree, sans-serif"
    fontSize: "2rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.01em"
    fontFeature: "\"tnum\" 1"
  headline:
    fontFamily: "Bowlby One, Figtree, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "0.01em"
  title:
    fontFamily: "Bowlby One, Figtree, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.01em"
  body:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.5
    fontFeature: "\"tnum\" 1"
  label:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 800
    lineHeight: 1.43
  label-stamp:
    fontFamily: "Bowlby One, Figtree, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    letterSpacing: "0.04em"
rounded:
  tag: "4px"
  cell: "5px"
  stamp: "7px"
  field: "12px"
  button: "14px"
  crate: "16px"
  board: "18px"
  pill: "999px"
spacing:
  hair: "2px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  column: "36rem"
components:
  button-press:
    backgroundColor: "{colors.tomato}"
    textColor: "{colors.paper}"
    typography: "{typography.title}"
    rounded: "{rounded.button}"
    padding: "0.7rem 1.1rem"
  button-crate:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "0.6rem 1rem"
  button-round:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "2.5rem"
  shelf-tag:
    backgroundColor: "{colors.tag}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.tag}"
    padding: "4px 8px 3px"
  board:
    backgroundColor: "{colors.slate}"
    textColor: "{colors.chalk}"
    typography: "{typography.display}"
    rounded: "{rounded.board}"
    padding: "16px 16px 12px"
  board-cell:
    backgroundColor: "{colors.slate-cell}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.cell}"
    padding: "0.04em 0.08em 0"
  chalk-pill:
    textColor: "{colors.chalk-dim}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "3px 9px"
  stamp-under:
    textColor: "{colors.kale-ink}"
    typography: "{typography.label-stamp}"
    rounded: "{rounded.stamp}"
    padding: "4px 10px 3px"
  stamp-over:
    textColor: "{colors.squash-ink}"
    typography: "{typography.label-stamp}"
    rounded: "{rounded.stamp}"
    padding: "4px 10px 3px"
  stamp-ink:
    textColor: "{colors.ink}"
    typography: "{typography.label-stamp}"
    rounded: "{rounded.stamp}"
    padding: "4px 10px 3px"
  stamp-tagged:
    backgroundColor: "{colors.tag}"
    textColor: "{colors.ink}"
    typography: "{typography.label-stamp}"
    rounded: "{rounded.stamp}"
    padding: "4px 10px 3px"
  crate:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.crate}"
    padding: "16px"
  field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.field}"
    padding: "0.65rem 0.8rem"
  alert:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.tomato-dark}"
    typography: "{typography.body}"
    rounded: "{rounded.crate}"
    padding: "12px"
  row-under:
    backgroundColor: "{colors.kale-wash}"
    textColor: "{colors.kale-ink}"
  row-over:
    backgroundColor: "{colors.squash-wash}"
    textColor: "{colors.squash-ink}"
  nav-link:
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.field}"
    padding: "4px 8px"
  nav-link-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.field}"
    padding: "4px 8px"
---

# Design System: Mise

## Overview

**Creative North Star: "The Market Stall"**

Mise is a farmers-market stall you carry in your pocket. The week's tally is a slate chalkboard in a crate-wood frame, its numerals sitting in raised cells that flip like a split-flap board when a price changes. Every estimate price is a yellow shelf tag, tilted, with a hard printed edge. Good and bad news arrive as rubber stamps. Everything else stands on an off-white produce-bin ground, separated by dashed crate-paper rules rather than boxed into cards.

The system is phone-first and dense in the way a market sign is dense: few words, chunky type, big tap targets, one column. Its loudness is reserved for the money: board, tags, stamps and the one tomato press button per view. Reading text is Figtree at bold weights so it survives a glance in a grocery aisle.

It rejects both category defaults the contract named: the green fintech dashboard with charts and soft cards, and the cream recipe blog.

**Key Characteristics:**
- Slate chalkboard tally with raised cells, edge-notch seams, and a cell-by-cell flip.
- Tilted yellow shelf tags with a hard ink edge for every price.
- Tomato press buttons that sink onto a darker bottom lip.
- Stamps for verdicts; kale and squash appear only for under and over, always with words.
- Bowlby One signs stand on the ground; sections are ruled, not carded.

## Colors

A market palette: one tomato for action, one tag yellow for prices, a slate-and-chalk board, and a strict two-color budget legend, all on warm off-white.

### Primary
- **Tomato** (`tomato`): the press button, the Mise wordmark, the caret, the focus ring, and the border of error cards. One per view as the main action. White on it is 4.84:1; as small text on the ground 4.56:1.
- **Tomato Lip** (`tomato-dark`): the press button's bottom lip, so the button reads as a raised block, and the ink of every error message.

### Secondary
- **Shelf-Tag Yellow** (`tag`): every estimate price (shelf tag), text selection, the field focus halo, the "tagged" stamp, the selected option in pickers and menus (at 40% over white), and over-budget readings on the chalkboard (tag-on-slate replaces squash there).

### Tertiary (the budget legend)
- **Kale** (`kale`): row borders and fills when paid is at or under estimate.
- **Kale Ink** (`kale-ink`): small text and stamps for "under" / "fits". 6.0:1 on Kale Wash.
- **Kale Wash** (`kale-wash`): the under row's background.
- **Squash** (`squash`): row borders when paid is more than the estimate.
- **Squash Ink** (`squash-ink`): small text and stamps for "over". 5.5:1 on Squash Wash.
- **Squash Wash** (`squash-wash`): the over row's background.

### Neutral
- **Slate** (`slate`): the chalkboard tally surface and the browser theme color.
- **Slate Cell** (`slate-cell`): raised board cells and the board's inner keyline. Chalk on it is 8.3:1.
- **Chalk** (`chalk`): board numerals and active nav text. 13.1:1 on Slate.
- **Chalk Dim** (`chalk-dim`): secondary board text ("of $150", days left). 8.3:1 on Slate.
- **Chalk Line** (`chalk-line`): the dashed border of chalk pills on the board.
- **Crate Wood** (`crate`): the board's 4px frame, the scrollbar thumb, and ingredient amounts in the recipe view.
- **Produce-Bin Ground** (`ground`): the page.
- **Paper** (`paper`): inside crates, fields, and secondary buttons.
- **Ink** (`ink`): text, outlines of fields, checkboxes, crate buttons, the tag's hard edge, the active nav pill.
- **Ink Soft** (`ink-soft`): secondary text on the ground. 7.2:1 on Ground.
- **Crate-Paper Rule** (`line`): crate borders, dashed section and row rules, nav underline.
- **Placeholder** (`placeholder`): input placeholder text, 5.1:1 on white.

### Named Rules
**The Strict Legend Rule.** Kale means under (paid at or below estimate, fits the budget); squash means over (paid more, over budget). Nothing else may use them, and neither ever appears without the word that says which.

**The Ink-and-Tag Rule.** Every status that is not about the budget (have / out in the pantry, selected, info, swaps) uses ink or tag yellow, never kale or squash. Errors use tomato.

In the build, kale and squash appear only on list rows (under / over), the budget-fit verdict card, and the under / over stamps.

## Typography

**Display Font:** Bowlby One (fallback Figtree, sans-serif), self-hosted via next/font at weight 400 only.
**Body Font:** Figtree (fallback ui-sans-serif, system-ui), loaded at 500, 600, 700, 800, 900.

**Character:** Bowlby One is the painted stall sign and the board's numerals: squat, heavy, friendly. Figtree is what you read, set bold so it holds up in an aisle at arm's length. Tabular figures are on for the whole body so prices line up.

### Hierarchy
- **Display** (Bowlby One 400, 2rem, line-height 1): board numerals for spent this week, set digit by digit in cells.
- **Headline** (Bowlby One 400, 1.75rem, 1.05, 0.01em): page signs standing on the ground ("This week", "My Pantry").
- **Title** (Bowlby One 400, 1.25rem): sub-signs, tag prices, press-button labels, the "New week, fresh board" line.
- **Body** (Figtree 700, 1rem, 1.5): most reading text; secondary copy drops to Ink Soft rather than a lighter weight.
- **Label** (Figtree 800, 0.875rem): row status sentences, field values, crate-button labels, chalk pills (0.75rem). Nav labels are 11px / 800.
- **Stamp label** (Bowlby One 400, 0.75rem to 1rem, 0.04em): verdict stamps.

### Named Rules
**The Sign-on-the-Ground Rule.** Bowlby headings stand directly on the ground like a stall sign; they never sit inside a card header.

**The Bold Aisle Rule.** Reading text is 700 or heavier. The lightest loaded Figtree weight is 500; there is no light or regular body text.

## Layout

One centered column, `max-width: 36rem`, with 12px side gutters and 16px top and bottom padding, on every screen and every viewport. There are no breakpoints: desktop shows the same phone column centered on the ground. The nav is a sticky top bar (ground at 95% with a light backdrop blur, 2px rule underneath) holding the tomato Mise wordmark and five icon-over-label links that scroll horizontally if needed.

Spacing runs on Tailwind's 4px grid. Gaps between related items are 8px, between groups 12px, between sections 16px; crate interiors are 16px (12px for dense lists). The tally board sits first on List and Plan; on Plan the chat input is fixed at the bottom within thumb reach.

**The Ruled Section Rule.** A section on the ground is separated by a 2px dashed crate-paper rule with 1rem above its content, not wrapped in a card. Rows inside a section are divided by the same dashed rule, never boxed.

## Elevation & Depth

Mostly flat with physical, printed depth: depth comes from borders, lips and hard edges, as if the objects were paper, wood and painted metal. There is one soft shadow in the system, under the chalkboard, to lift it off the ground.

### Shadow Vocabulary
- **Board lift** (`box-shadow: inset 0 0 0 2px #3a4a41, 0 6px 14px -8px rgb(29 36 31 / 0.55)`): the chalkboard only; inner keyline plus a short drop.
- **Printed tag edge** (`box-shadow: 2px 3px 0 #1d241f`): shelf tags only. A hard offset ink edge, native to this world.
- **Press lip** (`border-bottom: 5px solid #a82b1b`; 4px ink on crate buttons): the button stands on its lip and sinks 3px (2px) when pressed.
- **Field halo** (`box-shadow: 0 0 0 3px #ffd23f`): input focus.

**The Printed Edge Rule.** Hard offset shadows belong to shelf tags only; buttons get their depth from a bottom lip, not a shadow.

## Shapes

Chunky and rounded, like stall hardware. Small printed objects have tight corners (tag 4px, board cell 5px, stamp and checkbox 7px); things you touch are softer (fields 12px, buttons 14px, crates 16px, board 18px); pills and round buttons are fully rounded. Outlines are thick: 2px ink on fields, checkboxes and crate buttons; 2.5px currentColor on stamps; 4px crate wood around the board. Tags and stamps are tilted -3deg; nothing else rotates.

The board cell carries two 3x2px slate notches at mid-height on its left and right edges: the flap seam, drawn at the edges so it never crosses a digit.

## Components

### Buttons
- **Press (primary):** tomato block, white Bowlby label, 14px corners, 5px tomato-lip bottom border, padding 0.7rem 1.1rem. Hover brightens 6%; active sinks 3px and dims to 95% with no size change, so nothing reflows. 120ms ease-out. Disabled 55% opacity.
- **Crate (secondary):** white with a 2px ink outline and 4px ink bottom lip, Figtree 800, 14px corners. Active sinks 2px.
- **Round:** 40px white circle, 2px ink outline, for steppers. Disabled 35%.
- **Focus (all):** 3px tomato outline, 2px offset, 6px radius, from the global focus-visible rule.

### Shelf Tag
Tag-yellow chip in Bowlby, padding 4px 8px 3px, 4px corners, tilted -3deg, hard 2px 3px ink edge, no wrap. Every estimate price is one.

### Stamps
Inline Bowlby label in a 2.5px currentColor outline, 7px corners, 0.04em tracking, tilted -3deg. Four variants: **under** (kale ink), **over** (squash ink), **ink** (ink outline, for neutral states like "have"), **tagged** (tag-yellow fill with ink outline, for states like "out").

### Chalkboard Tally
Slate board, 4px crate frame, 18px corners, board lift. Spent is Display numerals in raised slate cells that flip (rotateX 90deg to 0, 420ms, `cubic-bezier(0.16, 1, 0.3, 1)`, 420px perspective) only for digits that changed, aligned from the right. Then "of $budget" in Chalk Dim, "$X left" in chalk or "$X over" in tag yellow, days left, Dinners / Extras as dashed chalk pills (tag-yellow when a side is over). Cells are hidden from screen readers; one polite live sentence speaks the tally.

### Cards / Containers (Crate)
- **Corner Style:** 16px.
- **Background:** white paper.
- **Shadow Strategy:** none (see Elevation).
- **Border:** 2px crate-paper rule; dashed for empty states; hover on linked crates turns the border ink.
- **Internal Padding:** 16px, 12px or 8px for dense lists.
Crates hold chat cards, lists and menus. They are never nested. Known mild departure: the recipe view boxes its content sections as separate crates rather than ruled sections on the ground.

### List Rows
Rows are separated by dashed rules. Once a price is paid the row takes a kale (under) or squash (over) border and wash, with a Label sentence in the matching ink stating which. The paid box is a field.

### Alerts
Errors are announced (`role="alert"`) in Figtree bold, in Tomato Lip ink. Inline errors are a single line under the control; blocking errors are a white crate with a tomato border, the message, and a crate button to retry. Never squash, never a wash.

### Inputs / Fields
- **Style:** white, 2px ink outline, 12px corners, padding 0.65rem 0.8rem, Figtree 800 value.
- **Focus:** outline removed; 3px tag-yellow halo. Caret is tomato.
- **Placeholder:** Placeholder warm grey.
- **Checkbox:** 1.6rem square, 2px ink outline, 7px corners; checked fills ink with a chalk tick.

### Navigation
Sticky top bar on the ground. Links are lucide icons (18px, stroke 2.5) over 11px Figtree 800 labels in Ink Soft, 12px corners; hover takes a crate-paper fill; the active link is an ink pill with chalk text and `aria-current="page"`.

### Icons
lucide-react outline icons, stroke 2.5 to 3, sized 13 to 18px, always `aria-hidden` beside a word.

## Do's and Don'ts

### Do:
- **Do** put every estimate price on a shelf tag and every verdict on a stamp.
- **Do** pair kale or squash with the word ("under", "fits", "over by $4"); color is never the only signal.
- **Do** use ink or tagged stamps for statuses unrelated to the budget.
- **Do** separate sections and rows with the 2px dashed crate-paper rule.
- **Do** honor `prefers-reduced-motion`: the board flip and button transitions switch off.
- **Do** keep tap targets large (fields, 40px round buttons, full-width press buttons in the aisle).

### Don't:
- **Don't** use kale or squash for errors, selection, quantities or decoration; errors are tomato, selection is tag yellow.
- **Don't** nest crates inside crates or box rows inside a section.
- **Don't** put a Bowlby sign inside a card header; signs stand on the ground.
- **Don't** give buttons or crates a drop shadow; hard offset edges are for shelf tags only.
- **Don't** draw the flap seam across the digits; it lives as notches at the cell edges.
- **Don't** add charts or soft gradient cards; the board is the dashboard.
