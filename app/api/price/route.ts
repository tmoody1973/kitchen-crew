import { auth } from "@clerk/nextjs/server";
import { nearbyStores, productsById, searchProducts, Product } from "@/lib/kroger";

type Item = { name: string; productId?: string };

function isItem(x: unknown): x is Item {
  const i = x as Item;
  return (
    typeof i?.name === "string" &&
    !!i.name.trim() &&
    i.name.length <= 80 &&
    (i.productId === undefined || (typeof i.productId === "string" && /^\d{1,20}$/.test(i.productId)))
  );
}

// POST { items: [{ name, productId? }], storeId } → { results: (Product | null)[] }.
// Re-prices the same product when one was chosen; otherwise takes the top search match.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { items, storeId } = (await req.json().catch(() => ({}))) as { items?: unknown; storeId?: unknown };
  if (!Array.isArray(items) || items.length === 0 || items.length > 50 || !items.every(isItem) || typeof storeId !== "string") {
    return Response.json({ error: "Send 1–50 items and a storeId" }, { status: 400 });
  }

  try {
    if (!(await nearbyStores()).some((s) => s.id === storeId)) {
      return Response.json({ error: "Unknown store" }, { status: 400 });
    }
    const chosen = await productsById(
      items.flatMap((i) => (i.productId ? [i.productId] : [])),
      storeId,
    ).catch((err) => {
      console.error("Kroger product lookup failed:", err);
      return new Map<string, Product>();
    });
    const results = await Promise.all(
      items.map(async (item): Promise<Product | null> => {
        const same = item.productId ? chosen.get(item.productId) : undefined;
        if (same) return same;
        try {
          return (await searchProducts(item.name.trim(), storeId, 1))[0] ?? null;
        } catch (err) {
          console.error(`Kroger price lookup failed for "${item.name}":`, err);
          return null;
        }
      }),
    );
    return Response.json({ results });
  } catch (err) {
    console.error("Kroger store check failed:", err);
    return Response.json({ results: items.map(() => null) });
  }
}
