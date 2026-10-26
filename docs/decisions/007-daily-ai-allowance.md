# 007: A daily AI allowance per person

- **Decision** — Every signed-in person gets a daily allowance of AI requests (40 crew chats, 10 photo reads, 30 recipe reads), with a bigger allowance for the shared judge login, on top of a monthly spend cap set on the Anthropic account.

- **Why this came up** — Mise is public, and anyone can sign in with Google. Every chat message, food-box photo, receipt and recipe link calls Claude, which Tarik pays for. Nothing counted how much one person used, so one heavy user, or one stuck script, could run up the bill with no warning. All judges also share one demo login, so whatever limit we picked had to leave room for many people on that one account.

- **Options**
  1. **Monthly spend cap on the Anthropic account only.** No code, and it's a hard guarantee on the bill. But when one person hits it, the AI stops for everyone, judges included.
  2. **Daily allowance per person, plus the spend cap.** Like a punch card that resets each day. One heavy user runs out of punches without touching anyone else. Costs about an hour of build and one add-on (Convex's official rate limiter, a tested component that does the counting).
  3. **Close new sign-ups until judging ends.** No code, but nobody new can try Mise, and it does nothing about heavy use by people already in.

- **What we chose and why** — Option 2, Tarik's call. The spend cap protects the wallet, and the daily allowance keeps one person from tripping the cap and shutting the demo off for judges. The counting runs in Convex next to the rest of the data, so it's transactional (two requests at once can't both sneak past the last punch). The amounts live in one file, `lib/ai-limits.ts`.

- **What we gave up** — The numbers are guesses, not based on measured cost per message, because we had no usage data yet. A real household planning a busy week could hit 40 chats. Every allowance starts over at 05:00 UTC, which is midnight in Milwaukee in summer but 11pm in winter, so the reset time drifts an hour with daylight saving. And if the limiter itself can't be reached, AI requests fail, not run unchecked: we chose a safe bill over uptime.

- **How we'll know if this was right** — No surprise on the Anthropic bill during judging, and no real user (not a test) ever sees the "You've used today's…" note in normal use. If someone does, the numbers are too low.

- **What actually happened** —
