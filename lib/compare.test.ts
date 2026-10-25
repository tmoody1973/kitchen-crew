import { describe, expect, it } from "vitest";
import { compareStores } from "./compare";

const rows = [
  { name: "chicken thighs", packs: 2 },
  { name: "scallions" },
  { name: "gochujang" },
  { name: "fish sauce" },
  { name: "rice" },
  { name: "Thai chilies" },
];
const p = (price: number) => ({ price });

describe("compareStores", () => {
  const result = compareStores(rows, [p(6.99), p(1.19), p(5.49), null, p(3), null], [p(5.99), p(0.99), null, p(4.29), p(3), null]);

  it("totals only items both stores carry, times packs", () => {
    expect(result.totalA).toBe(18.17); // 13.98 + 1.19 + 3
    expect(result.totalB).toBe(15.97); // 11.98 + 0.99 + 3
    expect(result.both).toBe(3);
  });
  it("lists items only one store has", () => {
    expect(result.onlyA).toEqual(["gochujang"]);
    expect(result.onlyB).toEqual(["fish sauce"]);
    expect(result.neither).toEqual(["Thai chilies"]);
  });
  it("shows the biggest differences first and skips ties", () => {
    expect(result.biggest).toEqual([
      { name: "chicken thighs", a: 13.98, b: 11.98 },
      { name: "scallions", a: 1.19, b: 0.99 },
    ]);
  });
});
