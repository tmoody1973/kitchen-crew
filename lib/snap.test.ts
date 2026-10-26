import { describe, expect, it } from "vitest";
import { maxAllotment, snapSplit, weeklyShare } from "./snap";

describe("SNAP", () => {
  it("uses USDA's FY2027 maximum allotments", () => {
    expect([1, 2, 3, 4, 8].map(maxAllotment)).toEqual([306, 562, 808, 1023, 1841]);
    expect(maxAllotment(10)).toBe(1841 + 2 * 225);
  });

  it("spreads a monthly benefit over weeks", () => {
    expect(weeklyShare(808)).toBe(186); // 808 × 12 ÷ 52 = 186.46
  });

  it("splits paid rows into SNAP and cash, with receipt fees as cash", () => {
    const items = [
      { paid: 4.29, snap: true, receiptId: "r" },
      { paid: 8.99, snap: false, receiptId: "r" }, // paper towels
      { paid: 2.5 }, // typed, unknown → unmarked
      { snap: true }, // not paid yet
    ];
    expect(snapSplit(items, [{ total: 13.38 }])).toEqual({ snap: 4.29, cash: 9.09, unmarked: 2.5 }); // cash = 8.99 + 0.10 fee
  });
});
