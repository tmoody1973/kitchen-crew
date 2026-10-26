import { auth } from "@clerk/nextjs/server";
import { nearbyStores } from "@/lib/kroger";
import { snapStoresNear } from "@/lib/snap-stores";

// GET ?storeId= → { near, stores }: SNAP-authorized food stores within 3 miles of the chosen Kroger store (USDA data).
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Not signed in" }, { status: 401 });
  const storeId = new URL(req.url).searchParams.get("storeId") ?? "";
  if (!/^\d{1,12}$/.test(storeId)) return Response.json({ error: "Send a storeId" }, { status: 400 });
  try {
    const store = (await nearbyStores()).find((s) => s.id === storeId);
    if (!store || store.lat === undefined || store.lng === undefined) return Response.json({ error: "Unknown store" }, { status: 400 });
    const stores = await snapStoresNear({ lat: store.lat, lng: store.lng });
    return Response.json({ near: store.name.split(" · ")[0] + " " + (store.name.split(" · ")[1] ?? ""), stores });
  } catch (err) {
    console.error("SNAP store lookup failed:", err);
    return Response.json({ error: "Couldn't reach USDA's SNAP store list. Try again later." }, { status: 502 });
  }
}
