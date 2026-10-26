import { describe, expect, it } from "vitest";
import { cartItemsFrom } from "./kroger-cart";

describe("Kroger cart items", () => {
  it("sends unpaid rows with a product, packs as quantity", () => {
    expect(
      cartItemsFrom([
        { productId: "0001111089305", packs: 2 },
        { productId: "0086262300022" },
        { productId: "0007680828008", paid: 1.59 }, // already bought
        { packs: 3 }, // no Kroger product
        { productId: "not-a-upc" },
      ]),
    ).toEqual([
      { upc: "0001111089305", quantity: 2 },
      { upc: "0086262300022", quantity: 1 },
    ]);
  });
});
