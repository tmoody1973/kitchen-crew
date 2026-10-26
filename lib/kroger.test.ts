import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("Kroger access pass", () => {
  it("28 searches at once send one token request, not 28", async () => {
    vi.stubEnv("KROGER_CLIENT_ID", "id");
    vi.stubEnv("KROGER_CLIENT_SECRET", "secret");
    let tokenCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/token")) {
          tokenCalls++;
          await new Promise((r) => setTimeout(r, 10)); // slow enough that all 28 start before it returns
          return Response.json({ access_token: "t", expires_in: 1800 });
        }
        return Response.json({ data: [] });
      }),
    );
    const { searchProducts } = await import("./kroger");
    await Promise.all(Array.from({ length: 28 }, (_, i) => searchProducts(`item ${i}`, "1")));
    expect(tokenCalls).toBe(1);
  });

  it("a failed token request is retried by the next search", async () => {
    vi.stubEnv("KROGER_CLIENT_ID", "id");
    vi.stubEnv("KROGER_CLIENT_SECRET", "secret");
    let tokenCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/token")) {
          tokenCalls++;
          return tokenCalls === 1 ? new Response("denied", { status: 403 }) : Response.json({ access_token: "t", expires_in: 1800 });
        }
        return Response.json({ data: [] });
      }),
    );
    const { searchProducts } = await import("./kroger");
    await expect(searchProducts("milk", "1")).rejects.toThrow("403");
    await expect(searchProducts("milk", "1")).resolves.toEqual([]);
    expect(tokenCalls).toBe(2);
  });
});

describe("sale prices", () => {
  it("keeps the regular price only when Kroger has a lower promo", async () => {
    const { saleRegular, toProduct } = await import("./kroger");
    expect(saleRegular({ regular: 5.49, promo: 3.99 })).toBe(5.49);
    expect(saleRegular({ regular: 5.49, promo: 0 })).toBeUndefined();
    expect(saleRegular({ regular: 3.99, promo: 3.99 })).toBeUndefined();
    expect(saleRegular(undefined)).toBeUndefined();
    const p = toProduct({ productId: "1", description: "Thighs", items: [{ size: "1 lb", price: { regular: 5.49, promo: 3.99 } }] });
    expect(p).toMatchObject({ price: 3.99, regularPrice: 5.49 });
    const q = toProduct({ productId: "2", description: "Rice", items: [{ price: { regular: 4.5, promo: 0 } }] });
    expect(q && "regularPrice" in q).toBe(false);
  });
});
