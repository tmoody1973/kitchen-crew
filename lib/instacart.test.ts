import { describe, expect, it } from "vitest";
import { listLineItems, recipeIngredients, upcFromProductId } from "./instacart";

describe("upcFromProductId", () => {
  it("rebuilds the 12-digit UPC (with check digit) from Kroger's 13-digit productId", () => {
    expect(upcFromProductId("0001300000640")).toBe("013000006408"); // Heinz ketchup
    expect(upcFromProductId("0004900005010")).toBe("049000050103"); // Coke 2 L
  });
  it("skips ids that aren't a padded UPC", () => {
    expect(upcFromProductId("4006381333931")).toBeUndefined();
    expect(upcFromProductId("abc")).toBeUndefined();
  });
});

describe("listLineItems", () => {
  const rows = [
    { name: "Heinz Tomato Ketchup", productId: "0001300000640", productName: "Heinz Tomato Ketchup", size: "20 oz", packs: 2 },
    { name: "green onions" },
    { name: "chicken thighs", paid: 9.5 },
    { name: "ketchup again", productId: "0001300000640", packs: 1 },
  ];
  it("sends unpaid rows with their exact product and pack count, once per product", () => {
    expect(listLineItems(rows)).toEqual([
      { name: "Heinz Tomato Ketchup", display_text: "Heinz Tomato Ketchup, 20 oz", upcs: ["013000006408"], line_item_measurements: [{ quantity: 3, unit: "each" }] },
      { name: "green onions", display_text: "green onions", line_item_measurements: [{ quantity: 1, unit: "each" }] },
    ]);
  });
});

describe("recipeIngredients", () => {
  it("maps units to Instacart's and leaves out things made in an earlier step", () => {
    expect(
      recipeIngredients([
        { name: "chicken thighs", amount: 1.25, unit: "lb", pantry: false },
        { name: "garlic", amount: 7, unit: "clove", pantry: false },
        { name: "soy sauce", amount: 2, unit: "tbsp", pantry: false },
        { name: "garlic oil", amount: 1, unit: "tbsp", pantry: false, madeInRecipe: true },
        { name: "salt", amount: 1, unit: "pinch", pantry: true },
      ]),
    ).toEqual([
      { name: "chicken thighs", display_text: "chicken thighs", measurements: [{ quantity: 1.25, unit: "pound" }] },
      { name: "garlic", display_text: "garlic", measurements: [{ quantity: 1, unit: "each" }] }, // 7 cloves = 1 head, not 7
      { name: "soy sauce", display_text: "soy sauce", measurements: [{ quantity: 2, unit: "tablespoon" }] },
      { name: "salt", display_text: "salt", measurements: [{ quantity: 1, unit: "each" }] },
    ]);
  });
});
