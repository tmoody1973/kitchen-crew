import { auth } from "@clerk/nextjs/server";
import { nearbyStores, searchProducts } from "@/lib/kroger";

// POST { name, storeId, limit? } → { options: Product[] } — brand/size choices for one item.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { name, storeId, limit } = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof name !== "string" || !name.trim() || name.length > 80 || typeof storeId !== "string") {
    return Response.json({ error: "Send an item name (1–80 characters) and a storeId" }, { status: 400 });
  }
  const max = typeof limit === "number" && limit >= 1 && limit <= 10 ? Math.floor(limit) : 5;

  try {
    if (!(await nearbyStores()).some((s) => s.id === storeId)) {
      return Response.json({ error: "Unknown store" }, { status: 400 });
    }
    return Response.json({ options: await searchProducts(name.trim(), storeId, max) });
  } catch (err) {
    // Kroger trouble shouldn't block the list: no options means "no price found".
    console.error(`Kroger product search failed for "${name}":`, err);
    return Response.json({ options: [] });
  }
}
