import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { COOKIE, exchangeCode } from "@/lib/kroger-cart";

// Kroger sends the shopper back here with a one-time code; we swap it for tokens kept in httpOnly cookies.
export async function GET(req: Request) {
  const { userId } = await auth();
  const url = new URL(req.url);
  const back = (result: string) => Response.redirect(new URL(`/list?kroger=${result}`, req.url), 302);
  if (!userId) return Response.redirect(new URL("/sign-in", req.url));
  const jar = await cookies();
  const state = jar.get(COOKIE.state)?.value;
  const code = url.searchParams.get("code");
  if (!code || !state || url.searchParams.get("state") !== state) return back("failed");
  try {
    const t = await exchangeCode(req, code);
    const secure = url.protocol === "https:";
    jar.set(COOKIE.access, t.access_token, { httpOnly: true, secure, sameSite: "lax", path: "/api/kroger", maxAge: Math.max(60, t.expires_in - 60) });
    if (t.refresh_token) jar.set(COOKIE.refresh, t.refresh_token, { httpOnly: true, secure, sameSite: "lax", path: "/api/kroger", maxAge: 60 * 60 * 24 * 180 });
    jar.delete(COOKIE.state);
    return back("connected");
  } catch (err) {
    console.error("Kroger connect failed:", err);
    return back("failed");
  }
}
