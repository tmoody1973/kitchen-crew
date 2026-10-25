// Kroger prices at your chosen store. Server-only: it reads the secret keys.
const API = "https://api.kroger.com/v1";

type KrogerPrice = { regular?: number; promo?: number };

/** Sale price if there is one (Kroger sends promo: 0 when there isn't), else the regular price. */
export function pickPrice(price: KrogerPrice | undefined): number | null {
  if (!price) return null;
  if (price.promo && price.promo > 0) return price.promo;
  if (price.regular && price.regular > 0) return price.regular;
  return null;
}

// ponytail: in-memory caches per server instance; fine for one user.
// Promises, not values: 28 searches starting at once share one token request instead of sending 28
// (Kroger answers a burst of token requests with 403).
let token: { value: Promise<string>; expiresAt: number } | null = null;
let stores: Promise<Store[]> | null = null;

export type Store = { id: string; name: string };
function getToken(): Promise<string> {
  if (token && Date.now() < token.expiresAt) return token.value;
  // Placeholder expiry until Kroger says how long the pass lasts; a failed request is forgotten so the next call retries.
  const value = fetchToken().catch((err) => {
    token = null;
    throw err;
  });
  token = { value, expiresAt: Date.now() + 60_000 };
  return value;
}

async function fetchToken(): Promise<string> {
  const { KROGER_CLIENT_ID, KROGER_CLIENT_SECRET } = process.env;
  if (!KROGER_CLIENT_ID || !KROGER_CLIENT_SECRET) throw new Error("Kroger keys missing in .env.local");
  const res = await fetch(`${API}/connect/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(`${KROGER_CLIENT_ID}:${KROGER_CLIENT_SECRET}`).toString("base64"),
    },
    body: "grant_type=client_credentials&scope=product.compact",
  });
  if (!res.ok) throw new Error(`Kroger token failed: ${res.status}`);
  const body = (await res.json()) as { access_token: string; expires_in: number };
  // Refresh a minute early so a request never goes out with an expired pass.
  if (token) token.expiresAt = Date.now() + (body.expires_in - 60) * 1000;
  return body.access_token;
}

async function krogerGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${await getToken()}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Kroger ${path.split("?")[0]} failed: ${res.status}`);
  return (await res.json()) as T;
}

type KrogerLocation = { locationId: string; chain: string; name: string; address: { city: string } };

const CHAIN_LABELS: Record<string, string> = { "PICK N SAVE": "Pick 'n Save", "METRO MARKET": "Metro Market" };

/** "Pick n Save - PNS Milw - 11th Garfield" in MILWAUKEE → "Pick 'n Save · 11th Garfield (Milwaukee)" */
export function storeLabel(loc: KrogerLocation): string {
  const chain = CHAIN_LABELS[loc.chain] ?? loc.chain;
  const branch = loc.name.split(" - ").pop() ?? loc.name;
  const city = loc.address.city.charAt(0) + loc.address.city.slice(1).toLowerCase();
  return `${chain} · ${branch} (${city})`;
}

/** Kroger-family stores within 10 miles of KROGER_ZIP, closest first. */
export function nearbyStores(): Promise<Store[]> {
  stores ??= fetchStores().catch((err) => {
    stores = null; // retry next time
    throw err;
  });
  return stores;
}

async function fetchStores(): Promise<Store[]> {
  const zip = process.env.KROGER_ZIP;
  if (!zip) throw new Error("KROGER_ZIP missing in .env.local");
  const { data } = await krogerGet<{ data: KrogerLocation[] }>(
    `/locations?filter.zipCode.near=${encodeURIComponent(zip)}&filter.radiusInMiles=10&filter.limit=15`,
  );
  return data.map((loc) => ({ id: loc.locationId, name: storeLabel(loc) }));
}

// One Kroger search at a time: slower (~0.4 s each) but never looks like a burst to Kroger's firewall.
export const KROGER_CONCURRENCY = 1;

/** Runs `fn` over items, at most `limit` at a time, keeping order. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export type Product = { productId: string; name: string; size?: string; price: number; imageUrl?: string };

type KrogerImage = { perspective: string; featured?: boolean; sizes: { size: string; url: string }[] };
type KrogerProduct = {
  productId: string;
  description: string;
  images?: KrogerImage[];
  items?: { size?: string; price?: KrogerPrice }[];
};

/** The featured (else front) photo at 100×100. */
export function pickImage(images: KrogerImage[] | undefined): string | undefined {
  const img = images?.find((i) => i.featured) ?? images?.find((i) => i.perspective === "front");
  return img?.sizes.find((s) => s.size === "small")?.url;
}

function toProduct(p: KrogerProduct): Product | null {
  const price = pickPrice(p.items?.[0]?.price);
  return price === null
    ? null
    : { productId: p.productId, name: p.description, size: p.items?.[0]?.size, price, imageUrl: pickImage(p.images) };
}

/** "Tomatoes" → "tomato", "thighs" → "thigh", so plurals still match. */
function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.endsWith("ies") ? w.slice(0, -3) + "y" : w.endsWith("oes") ? w.slice(0, -2) : w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w));
}

/**
 * Kroger matches words, not meaning ("fish sauce" also finds tartar sauce from Louisiana Fish Fry).
 * Keep only the best tier that exists: exact phrase, else all words anywhere, else everything.
 * Kroger's order is kept within the tier.
 * ponytail: word matching only; Claude picks by meaning for planned meals (slice 3).
 */
export function rankByRelevance<T extends { name: string }>(term: string, products: T[]): T[] {
  const q = words(term);
  const phrase = ` ${q.join(" ")} `;
  const score = (name: string) => {
    const w = words(name);
    if (` ${w.join(" ")} `.includes(phrase)) return 2;
    return q.every((t) => w.includes(t)) ? 1 : 0;
  };
  const scored = products.map((p) => ({ p, s: score(p.name) }));
  const best = Math.max(0, ...scored.map(({ s }) => s));
  return scored.filter(({ s }) => s === best).map(({ p }) => p);
}

/** Kroger's top priced matches in its own order, for Claude to choose from by meaning. */
export async function searchCandidates(term: string, locationId: string, limit = 10): Promise<Product[]> {
  const { data } = await krogerGet<{ data: KrogerProduct[] }>(
    `/products?filter.term=${encodeURIComponent(term)}&filter.locationId=${locationId}&filter.limit=20`,
  );
  const priced = data.map(toProduct).filter((p): p is Product => p !== null);
  // Exact-phrase matches first so they survive the cut, then everything else.
  const best = rankByRelevance(term, priced);
  return [...best, ...priced.filter((p) => !best.includes(p))].slice(0, limit);
}

/** Up to `limit` priced products for a search at a store, most relevant first (from Kroger's top 20). */
export async function searchProducts(term: string, locationId: string, limit = 5): Promise<Product[]> {
  const { data } = await krogerGet<{ data: KrogerProduct[] }>(
    `/products?filter.term=${encodeURIComponent(term)}&filter.locationId=${locationId}&filter.limit=20`,
  );
  const priced = data.map(toProduct).filter((p): p is Product => p !== null);
  return rankByRelevance(term, priced).slice(0, limit);
}

/** Current prices for already-chosen products at a store. Missing from the map = not sold there. */
export async function productsById(ids: string[], locationId: string): Promise<Map<string, Product>> {
  if (ids.length === 0) return new Map();
  const { data } = await krogerGet<{ data: KrogerProduct[] }>(
    `/products?filter.productId=${ids.map(encodeURIComponent).join(",")}&filter.locationId=${locationId}`,
  );
  return new Map(
    data.map(toProduct).filter((p): p is Product => p !== null).map((p) => [p.productId, p]),
  );
}
