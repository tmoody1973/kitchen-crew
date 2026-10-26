import { auth } from "@clerk/nextjs/server";
import { findFoodHelp, type HelpMode } from "@/lib/food-help";

const MODES: HelpMode[] = ["free", "school", "summer", "wic"];

// GET ?zip=&mode= → { zip, mode, places }: free food help near a ZIP (default: the app's area ZIP).
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Not signed in" }, { status: 401 });
  const url = new URL(req.url);
  const zip = (url.searchParams.get("zip") || process.env.KROGER_ZIP || "").trim();
  const mode = (url.searchParams.get("mode") ?? "free") as HelpMode;
  if (!/^\d{5}$/.test(zip) || !MODES.includes(mode)) return Response.json({ error: "Send a 5-digit ZIP" }, { status: 400 });
  try {
    return Response.json({ zip, mode, places: await findFoodHelp(zip, mode) });
  } catch (err) {
    console.error("Food help lookup failed:", err);
    return Response.json({ error: "Couldn't reach the food-help directory. Try again in a minute, or call 211." }, { status: 502 });
  }
}
