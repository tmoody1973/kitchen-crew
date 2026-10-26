import { auth } from "@clerk/nextjs/server";
import { spendAllowance } from "@/lib/ai-allowance";
import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

export const maxDuration = 60;
const MAX_BYTES = 3_500_000;

const boxSchema = z.object({
  isFood: z.boolean().describe("false if the photo doesn't show groceries or a food box"),
  items: z
    .array(
      z.object({
        name: z.string().describe("Plain grocery name a store would use, e.g. 'canned green beans', 'peanut butter', 'white rice'"),
        qty: z.number().int().min(1).max(99).describe("How many of it you can see (cans, boxes, bags)"),
      }),
    )
    .max(60),
});

// POST { image } → { items: [{ name, qty }] } — Claude lists the foods in a pantry-box photo; the person confirms them.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Not signed in" }, { status: 401 });
  const { image } = (await req.json().catch(() => ({}))) as { image?: unknown };
  const match = typeof image === "string" ? image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/) : null;
  if (!match) return Response.json({ error: "Send a photo (JPEG, PNG or WebP)." }, { status: 400 });
  const [, mediaType, data] = match;
  if (data.length * 0.75 > MAX_BYTES) return Response.json({ error: "That photo is too large. Try again a little farther away." }, { status: 413 });
  const limited = await spendAllowance("photo");
  if (limited) return Response.json({ error: limited }, { status: 429 });
  try {
    const { output } = await generateText({
      model: anthropic("claude-sonnet-5-5"),
      output: Output.object({ schema: boxSchema }),
      instructions:
        "You list the foods in a photo of a food-pantry box or groceries on a table. Name each food plainly, the way a grocery " +
        "store would (include 'canned' for cans), and count what you can see. Skip non-food items. Don't guess at items you can't see.",
      messages: [{ role: "user", content: [{ type: "file", mediaType, data }, { type: "text", text: "List the foods in this photo with counts." }] }],
    });
    if (!output.isFood || output.items.length === 0) return Response.json({ error: "I couldn't see food in that photo. Try again with the items spread out." }, { status: 422 });
    return Response.json({ items: output.items.map((i) => ({ name: i.name.trim().toLowerCase().slice(0, 60), qty: i.qty })) });
  } catch (err) {
    console.error("Box photo read failed:", err);
    return Response.json({ error: "Couldn't read that photo. Use the checklist instead." }, { status: 502 });
  }
}
