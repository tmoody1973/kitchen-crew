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

  it("uses the picker's judgment when units don't convert", () => {
    expect(packagesNeeded(toBase(2, "ct"), "13.5 fl oz", 2)).toEqual({ packs: 2, exact: true }); // 2 cans
    expect(packagesNeeded(toBase(3, "ct"), "2 lb", 1)).toEqual({ packs: 1, exact: true }); // 3 carrots → 1 bag
    expect(packagesNeeded(toBase(3, "ct"), "2 lb")).toEqual({ packs: 1, exact: false }); // no judgment → check amount
    expect(packagesNeeded(toBase(3, "ct"), "6 ct", 5)).toEqual({ packs: 1, exact: true }); // same units: math wins
    expect(packagesNeeded(toBase(1, "ct"), "1 each")).toEqual({ packs: 1, exact: true });
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
    expect(parseSize("1/2 gal")?.base).toBeCloseTo(1892.7, 0); // half a gallon, not 2
    expect(packagesNeeded(toBase(3, "cup"), "1/2 gal")).toEqual({ packs: 1, exact: true });
    expect(packagesNeeded(toBase(10, "cup"), "1/2 gal")).toEqual({ packs: 2, exact: true });
  });

  it("adds amounts across meals before rounding", () => {
    // 0.4 lb on Tuesday + 0.4 lb on Thursday = 0.8 lb → 1 pack (rounding each meal separately would buy 2).
    expect(packagesNeeded(addAmounts(toBase(1.5, "lb"), toBase(1, "lb")), "1 lb").packs).toBe(3);
    expect(packagesNeeded(addAmounts(toBase(0.4, "lb"), toBase(0.4, "lb")), "1 lb").packs).toBe(1);
    expect(addAmounts(toBase(1, "lb"), toBase(1, "cup"))).toBeNull();
  });

  it("buys green onions and celery by the bunch, not one bunch per stalk", () => {
    // Recipes count stalks; Kroger sells "Green Onions, 1 each" = one bunch (~8 stalks).
    expect(packagesNeeded(toBase(8, "ct"), "1 each", undefined, "green onions")).toEqual({ packs: 1, exact: true });
    expect(packagesNeeded(toBase(10, "ct"), "1 each", undefined, "Scallions")).toEqual({ packs: 2, exact: true });
    expect(packagesNeeded(toBase(3, "ct"), "1 ct", undefined, "celery")).toEqual({ packs: 1, exact: true });
  });

  it("still buys one each per item for things sold singly", () => {
    expect(packagesNeeded(toBase(3, "ct"), "1 each", undefined, "lemons")).toEqual({ packs: 99, exact: true }); // deliberately broken to prove CI goes red
  });
});
