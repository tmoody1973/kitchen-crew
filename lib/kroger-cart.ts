// Kroger account connection (OAuth: the shopper signs in at Kroger and approves "add to cart").
// Server-only. Tokens live in httpOnly cookies on the shopper's device, never in our database.
const API = "https://api.kroger.com/v1";
export const SCOPE = "cart.basic:write";
export const COOKIE = { access: "kroger_at", refresh: "kroger_rt", state: "kroger_state" } as const;

export const redirectUri = (req: Request) => `${new URL(req.url).origin}/api/kroger/callback`;

function basicAuth() {
  const { KROGER_CLIENT_ID, KROGER_CLIENT_SECRET } = process.env;
  if (!KROGER_CLIENT_ID || !KROGER_CLIENT_SECRET) throw new Error("Kroger keys missing");
  return "Basic " + Buffer.from(`${KROGER_CLIENT_ID}:${KROGER_CLIENT_SECRET}`).toString("base64");
}

export function authorizeUrl(req: Request, state: string) {
  const q = new URLSearchParams({ scope: SCOPE, response_type: "code", client_id: process.env.KROGER_CLIENT_ID ?? "", redirect_uri: redirectUri(req), state });
  return `${API}/connect/oauth2/authorize?${q}`;
}

export type Tokens = { access_token: string; refresh_token?: string; expires_in: number };

async function tokenRequest(body: Record<string, string>): Promise<Tokens> {
  const res = await fetch(`${API}/connect/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: basicAuth() },
    body: new URLSearchParams(body),
  });
  if (!res.ok) throw new Error(`Kroger token request failed: ${res.status}`);
  return (await res.json()) as Tokens;
}

export const exchangeCode = (req: Request, code: string) => tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri(req) });
export const refreshTokens = (refresh: string) => tokenRequest({ grant_type: "refresh_token", refresh_token: refresh });

export type CartItem = { upc: string; quantity: number };

/** Adds items to the signed-in shopper's cart for pickup. Returns the HTTP status (204 = added). */
export async function addToCart(accessToken: string, items: CartItem[]): Promise<number> {
  const res = await fetch(`${API}/cart/add`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ items: items.map((i) => ({ ...i, modality: "PICKUP" })) }),
  });
  if (!res.ok && res.status !== 401) console.error("Kroger cart add failed:", res.status, (await res.text()).slice(0, 300));
  return res.status;
}

/** Unpaid list rows with a chosen Kroger product → cart items (packs as quantity). */
export function cartItemsFrom(rows: ReadonlyArray<{ productId?: string; packs?: number; paid?: number }>): CartItem[] {
  return rows.flatMap((r) => (r.productId && r.paid === undefined && /^\d{1,20}$/.test(r.productId) ? [{ upc: r.productId, quantity: Math.min(Math.max(r.packs ?? 1, 1), 50) }] : []));
}
