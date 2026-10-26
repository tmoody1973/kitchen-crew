import { auth } from "@clerk/nextjs/server";
import { spendAllowance } from "@/lib/ai-allowance";
import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

export const maxDuration = 60;

const MAX_BYTES = 3_500_000; // the phone shrinks the photo first; this keeps us under Vercel's 4.5 MB body limit

const receiptSchema = z.object({
  isReceipt: z.boolean().describe("false if the photo isn't a store receipt"),
  store: z.string().describe("Store name as printed, e.g. Pick 'n Save"),
  subtotal: z.number().nullable().describe("Item subtotal before tax and fees, or null if not printed"),
  tax: z.number().nullable().describe("Total sales tax, or null if none printed"),
  fees: z.number().nullable().describe("Delivery, service, bag fees and tip added together, or null if none"),
  total: z.number().nullable().describe("The final amount charged (balance due / total), or null if unreadable"),
  itemCount: z.number().int().nullable().describe("Number of items if printed, else null"),
});

// POST { image: "data:image/jpeg;base64,…" } → { receipt } — Claude reads the printed totals; the person confirms them.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { image } = (await req.json().catch(() => ({}))) as { image?: unknown };
  const match = typeof image === "string" ? image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/) : null;
  if (!match) return Response.json({ error: "Send a receipt photo (JPEG, PNG or WebP)." }, { status: 400 });
  const [, mediaType, data] = match;
  if (data.length * 0.75 > MAX_BYTES) return Response.json({ error: "That photo is too large. Try again a little farther away." }, { status: 413 });
  const limited = await spendAllowance("photo");
  if (limited) return Response.json({ error: limited }, { status: 429 });

  try {
    const { output } = await generateText({
      model: anthropic("claude-sonnet-5-5"),
      output: Output.object({ schema: receiptSchema }),
      instructions:
        "You read grocery receipts. Copy the printed numbers exactly; never estimate or do arithmetic beyond adding the listed fees together. " +
        "Use the final charged total (after coupons and savings). If a number isn't printed or you can't read it, use null.",
      messages: [
        {
          role: "user",
          content: [
            { type: "file", mediaType, data },
            { type: "text", text: "Read this receipt's store, subtotal, tax, fees, and total." },
          ],
        },
      ],
    });
    if (!output.isReceipt) return Response.json({ error: "That doesn't look like a receipt. Try again with the whole receipt in the photo." }, { status: 422 });
    const ok = (n: number | null) => (n !== null && Number.isFinite(n) && n >= 0 && n <= 10_000 ? Math.round(n * 100) / 100 : null);
    return Response.json({
      receipt: {
        store: output.store.slice(0, 60),
        subtotal: ok(output.subtotal),
        tax: ok(output.tax),
        fees: ok(output.fees),
        total: ok(output.total),
        itemCount: output.itemCount,
      },
    });
  } catch (err) {
    console.error("Receipt read failed:", err);
    return Response.json({ error: "Couldn't read that receipt. Type the total instead." }, { status: 502 });
  }
}
