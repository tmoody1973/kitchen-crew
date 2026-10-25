import { describe, expect, it } from "vitest";
import { filterRecipes, topTags } from "./filter";

const r = (title: string, tags: string[] = [], ingredients: string[] = [], sourceName = "") => ({
  title,
  tags,
  sourceName,
  ingredients: ingredients.map((name) => ({ name })),
});
const shelf = [
  r("Creamy Miso Chicken", ["japanese", "chicken", "one-pan", "quick"], ["chicken thighs", "white miso"], "Aaron and Claire"),
  r("Beef Rendang", ["indonesian", "beef", "spicy", "comfort"], ["beef chuck", "coconut milk"], "Chef Billy Parisi"),
  r("Chicken Lettuce Wraps", ["chinese", "chicken", "quick"], ["ground chicken", "water chestnuts"]),
  r("Cast Iron Focaccia", ["bread", "vegetarian"]),
];

describe("filterRecipes", () => {
  it("returns everything with no search or chips", () => {
    expect(filterRecipes(shelf, "", [])).toHaveLength(4);
  });
  it("matches title, tags, ingredients, and channel, ignoring case", () => {
    expect(filterRecipes(shelf, "MISO", []).map((x) => x.title)).toEqual(["Creamy Miso Chicken"]);
    expect(filterRecipes(shelf, "coconut", []).map((x) => x.title)).toEqual(["Beef Rendang"]);
    expect(filterRecipes(shelf, "spicy", []).map((x) => x.title)).toEqual(["Beef Rendang"]);
    expect(filterRecipes(shelf, "parisi", []).map((x) => x.title)).toEqual(["Beef Rendang"]);
  });
  it("needs every word to match, in any field", () => {
    expect(filterRecipes(shelf, "chicken quick", []).map((x) => x.title)).toEqual(["Creamy Miso Chicken", "Chicken Lettuce Wraps"]);
    expect(filterRecipes(shelf, "chicken spicy", [])).toEqual([]);
  });
  it("chips narrow the list: every chosen tag must be on the recipe", () => {
    expect(filterRecipes(shelf, "", ["chicken", "quick"]).map((x) => x.title)).toEqual(["Creamy Miso Chicken", "Chicken Lettuce Wraps"]);
    expect(filterRecipes(shelf, "", ["chicken", "japanese"]).map((x) => x.title)).toEqual(["Creamy Miso Chicken"]);
  });
  it("handles recipes with no tags yet", () => {
    expect(filterRecipes([r("Plain Video")].map(({ tags, ...x }) => x), "", ["chicken"])).toEqual([]);
  });
});

describe("topTags", () => {
  it("lists the most used tags first, ties alphabetical", () => {
    expect(topTags(shelf, 3)).toEqual(["chicken", "quick", "beef"]);
  });
});
