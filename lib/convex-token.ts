import { auth } from "@clerk/nextjs/server";

/** A sign-in pass Convex accepts, the same way the browser gets one. */
export async function convexToken(): Promise<string | null> {
  const { getToken, sessionClaims } = await auth();
  return sessionClaims?.aud === "convex" ? getToken() : getToken({ template: "convex" });
}
