import { auth } from "@clerk/nextjs/server";
import { nearbyStores } from "@/lib/kroger";

// GET → { stores: [{ id, name }] } nearby Pick 'n Save / Metro Market stores.
export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Not signed in" }, { status: 401 });
  try {
    return Response.json({ stores: await nearbyStores() });
  } catch (err) {
    console.error("Kroger store lookup failed:", err);
    return Response.json({ error: "Couldn't load stores" }, { status: 502 });
  }
}
