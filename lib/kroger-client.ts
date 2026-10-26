// Browser-side calls to our own server routes (the Kroger keys stay on the server).
export type Product = { productId: string; name: string; size?: string; price: number; regularPrice?: number; imageUrl?: string };

/** Current price per item at a store; re-prices the same product when one was chosen. null = no price found. */
export async function fetchPrices(
  items: { name: string; productId?: string }[],
  storeId: string,
): Promise<(Product | null)[]> {
  const res = await fetch("/api/price", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items, storeId }),
  });
  if (!res.ok) return items.map(() => null);
  return ((await res.json()) as { results: (Product | null)[] }).results;
}

/** Brand/size choices for one item at a store. */
export async function fetchOptions(name: string, storeId: string): Promise<Product[]> {
  const res = await fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, storeId, limit: 5 }),
  });
  if (!res.ok) return [];
  return ((await res.json()) as { options: Product[] }).options;
}
