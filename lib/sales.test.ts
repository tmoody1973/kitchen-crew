import { describe, expect, it } from "vitest";
import { bestSale, toSale, topIngredients } from "./sales";

describe("sales", () => {
  it("only counts real sales", () => {
    expect(toSale("butter", { productId: "1", name: "Butter", price: 2.99, regularPrice: 5.99 })?.save).toBe(3);
    expect(toSale("butter", { productId: "1", name: "Butter", price: 2.99 })).toBeNull();
    expect(toSale("butter", undefined)).toBeNull();
  });

  it("picks the biggest saving among relevant matches", () => {
    const sale = bestSale("butter", [
      { productId: "1", name: "Salted Butter", price: 3.99, regularPrice: 4.39 },
      { productId: "2", name: "Challenge Butter", price: 2.99, regularPrice: 5.99 },
      { productId: "5", name: "Unsalted Butter", price: 4, regularPrice: 4 },
      { productId: "3", name: "Butter Cookies", price: 1, regularPrice: 9 },
      { productId: "4", name: "Peanut Brittle", price: 1, regularPrice: 20 },
    ]);
    expect(sale?.productId).toBe("2"); // only Kroger's first 3 word matches count; the cookies are 3rd and the brittle never matches
    expect(bestSale("butter", [{ productId: "4", name: "Peanut Brittle", price: 1, regularPrice: 20 }])).toBeNull();
  });

  it("ranks recipe ingredients by how many recipes use them, skipping pantry and unread", () => {
    const top = topIngredients(
      [
        { _id: "a", title: "A", ingredients: [{ name: "Butter", pantry: false }, { name: "salt", pantry: true }, { name: "butter", pantry: false }] },
        { _id: "b", title: "B", ingredients: [{ name: "butter", pantry: false }, { name: "pasta", pantry: false }] },
        { _id: "c", title: "C", unread: true, ingredients: [{ name: "pasta", pantry: false }] },
      ],
      5,
    );
    expect(top.map((t) => [t.name, t.recipes.length])).toEqual([["Butter", 2], ["pasta", 1]]);
  });
});
