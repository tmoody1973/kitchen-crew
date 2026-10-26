import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { convexToken } from "@/lib/convex-token";
import { addToCart, cartItemsFrom, COOKIE, refreshTokens } from "@/lib/kroger-cart";

// POST { offset? } → adds the week's unpaid list items to the shopper's own Kroger-family cart.
// { needsConnect: true } when this device hasn't connected a Kroger account yet (or the connection expired).
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Not signed in" }, { status: 401 });
  const { offset } = (await req.json().catch(() => ({}))) as { offset?: unknown };
  const token = await convexToken();
  if (!token) return Response.json({ error: "Not signed in" }, { status: 401 });

  const rows = await fetchQuery(api.listItems.mine, { offset: offset === 1 ? 1 : 0 }, { token });
  const items = cartItemsFrom(rows);
  if (items.length === 0) return Response.json({ error: "Nothing to send: unpaid items need a Kroger product (use Find at Kroger)." }, { status: 400 });

  const jar = await cookies();
  const secure = new URL(req.url).protocol === "https:";
  let access = jar.get(COOKIE.access)?.value;
  const refresh = jar.get(COOKIE.refresh)?.value;
  const renew = async () => {
    if (!refresh) return undefined;
    try {
      const t = await refreshTokens(refresh);
      jar.set(COOKIE.access, t.access_token, { httpOnly: true, secure, sameSite: "lax", path: "/api/kroger", maxAge: Math.max(60, t.expires_in - 60) });
      if (t.refresh_token) jar.set(COOKIE.refresh, t.refresh_token, { httpOnly: true, secure, sameSite: "lax", path: "/api/kroger", maxAge: 60 * 60 * 24 * 180 });
      return t.access_token;
    } catch (err) {
      console.error("Kroger refresh failed:", err);
      return undefined;
    }
  };
  if (!access) access = await renew();
  if (!access) return Response.json({ needsConnect: true }, { status: 401 });

  try {
    let status = await addToCart(access, items);
    if (status === 401) {
      access = await renew();
      if (!access) return Response.json({ needsConnect: true }, { status: 401 });
      status = await addToCart(access, items);
    }
    if (status === 401) return Response.json({ needsConnect: true }, { status: 401 });
    if (status >= 300) return Response.json({ error: `Kroger didn't accept the cart (error ${status}). Try again in a minute.` }, { status: 502 });
    return Response.json({ added: items.length, packages: items.reduce((s, i) => s + i.quantity, 0) });
  } catch (err) {
    console.error("Kroger cart failed:", err);
    return Response.json({ error: "Couldn't reach Kroger. Try again in a minute." }, { status: 502 });
  }
}
