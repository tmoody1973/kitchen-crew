import { describe, expect, it } from "vitest";
import { boxCovers, fromBox } from "./pantry-box";

describe("pantry box", () => {
  const box = ["canned green beans", "white rice", "canned chicken", "peanut butter"];

  it("matches the same food, ignoring packaging words and plurals", () => {
    expect(boxCovers("green beans", box)).toBe(true);
    expect(boxCovers("long-grain white rice", box)).toBe(true);
    expect(boxCovers("chicken thighs", box)).toBe(false);
    expect(boxCovers("butter", box)).toBe(false); // "butter" is not "peanut butter"
    expect(boxCovers("rice", box)).toBe(true); // "white rice" minus "white"
    expect(boxCovers("chicken", box)).toBe(true); // "canned chicken" minus "canned"
  });

  it("only counts ingredients the plan marked as already in the pantry", () => {
    const ings = [
      { name: "green beans", pantry: true },
      { name: "white rice", pantry: false },
      { name: "onion", pantry: true },
    ];
    expect(fromBox(ings, box)).toEqual(["green beans"]);
    expect(fromBox(ings, [])).toEqual([]);
  });
});
