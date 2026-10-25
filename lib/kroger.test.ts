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
