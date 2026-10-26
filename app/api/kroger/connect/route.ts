import { auth } from "@clerk/nextjs/server";
import { randomBytes } from "node:crypto";
import { authorizeUrl, COOKIE } from "@/lib/kroger-cart";

// GET → Kroger's sign-in page; a random state in a cookie proves the callback came from this browser.
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.redirect(new URL("/sign-in", req.url));
  const state = randomBytes(16).toString("hex");
  const secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
  return new Response(null, {
    status: 302,
    headers: { Location: authorizeUrl(req, state), "Set-Cookie": `${COOKIE.state}=${state}; Path=/api/kroger; HttpOnly; SameSite=Lax; Max-Age=600${secure}` },
  });
}
