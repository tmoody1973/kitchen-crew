import { describe, expect, it } from "vitest";
import { addAmounts, packagesNeeded, parseSize, toBase } from "./quantities";

describe("recipe amounts → packages", () => {
  it("rounds up to whole packages", () => {
    expect(packagesNeeded(toBase(1.5, "lb"), "1 lb")).toEqual({ packs: 2, exact: true });
    expect(packagesNeeded(toBase(1, "lb"), "1 lb")).toEqual({ packs: 1, exact: true });
    expect(packagesNeeded(toBase(16, "oz"), "1 lb")).toEqual({ packs: 1, exact: true });
    expect(packagesNeeded(toBase(30, "ct"), "24 ct")).toEqual({ packs: 2, exact: true });
  });

  it("converts between units of the same kind", () => {
    expect(packagesNeeded(toBase(2, "tbsp"), "6.7 fl oz")).toEqual({ packs: 1, exact: true });
    expect(packagesNeeded(toBase(3, "cups"), "2 liter")).toEqual({ packs: 1, exact: true });
    expect(packagesNeeded(toBase(2, "Pounds"), "16 oz")).toEqual({ packs: 2, exact: true });
  });

  it("buys one package per counted item when the package isn't sold by count", () => {
    expect(packagesNeeded(toBase(2, "ct"), "13.5 fl oz")).toEqual({ packs: 2, exact: true }); // 2 cans
    expect(packagesNeeded(toBase(1, "ct"), "1 each")).toEqual({ packs: 1, exact: true });
    expect(packagesNeeded(toBase(3, "ct"), "6 ct")).toEqual({ packs: 1, exact: true }); // 3 eggs from a 6-pack
  });

  it("falls back to 1 package when units don't convert", () => {
    expect(packagesNeeded(toBase(3, "cloves"), "1 ct")).toEqual({ packs: 1, exact: false });
    expect(packagesNeeded(toBase(1, "lb"), "24 ct")).toEqual({ packs: 1, exact: false });
    expect(packagesNeeded(toBase(1, "lb"), undefined)).toEqual({ packs: 1, exact: false });
  });

  it("reads Kroger package sizes", () => {
    expect(parseSize("3 lb bag")?.dim).toBe("weight");
    expect(parseSize("12 fl oz")?.dim).toBe("volume");
    expect(parseSize("24 ct")).toEqual({ dim: "count", base: 24 });
    expect(parseSize("each")).toBeNull();
  });

  it("adds amounts across meals before rounding", () => {
    // 0.4 lb on Tuesday + 0.4 lb on Thursday = 0.8 lb → 1 pack (rounding each meal separately would buy 2).
    expect(packagesNeeded(addAmounts(toBase(1.5, "lb"), toBase(1, "lb")), "1 lb").packs).toBe(3);
    expect(packagesNeeded(addAmounts(toBase(0.4, "lb"), toBase(0.4, "lb")), "1 lb").packs).toBe(1);
    expect(addAmounts(toBase(1, "lb"), toBase(1, "cup"))).toBeNull();
  });
});
