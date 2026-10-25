import { auth } from "@clerk/nextjs/server";
import { nearbyStores, productsById } from "@/lib/kroger";
import { readBarcode } from "@/lib/barcode";

// POST { code, storeId } → { product } for a scanned packaged item, priced at the chosen store.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Not signed in" }, { status: 401 });
  const { code, storeId } = (await req.json().catch(() => ({}))) as { code?: unknown; storeId?: unknown };
  if (typeof code !== "string" || code.length > 20 || typeof storeId !== "string") {
    return Response.json({ error: "Send a barcode and a storeId" }, { status: 400 });
  }
  const scan = readBarcode(code);
  if (scan?.kind !== "product") return Response.json({ error: "That isn't a product barcode." }, { status: 400 });
  try {
    if (!(await nearbyStores()).some((s) => s.id === storeId)) return Response.json({ error: "Unknown store" }, { status: 400 });
    const product = (await productsById([scan.productId], storeId)).get(scan.productId);
    if (!product) return Response.json({ error: "Kroger doesn't list that item at your store." }, { status: 404 });
    return Response.json({ product });
  } catch (err) {
    console.error("Barcode lookup failed:", err);
    return Response.json({ error: "Couldn't reach Kroger. Try again in a minute." }, { status: 502 });
  }
}
