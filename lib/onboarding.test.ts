import { describe, expect, it } from "vitest";
import { DEFAULT_MEMBERS, sizeAdjustment, suggestedBudget } from "./usda";
import { describeHousehold, servingsFor } from "./household";

describe("household budgets from the USDA table", () => {
  it("keeps Tarik's household at the old numbers", () => {
    expect(suggestedBudget("low")).toBe(222); // (73.3 + 63.8 + 74.5) × 1.05
    expect(servingsFor(DEFAULT_MEMBERS)).toBe(3.5);
  });

  it("applies USDA's household-size adjustment", () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(sizeAdjustment)).toEqual([1.2, 1.1, 1.05, 1, 0.95, 0.95, 0.9]);
    // One woman, low-cost: 63.80 × 1.2 = 76.56 → $77
    expect(suggestedBudget("low", { men: 0, women: 1, teenBoys: 0, teenGirls: 0, kids: 0, littleKids: 0 })).toBe(77);
    // USDA's thrifty reference family: man + woman 20–50, kids 6–8 and 9–11 = $236.30
    expect(suggestedBudget("thrifty", { men: 1, women: 1, teenBoys: 0, teenGirls: 0, kids: 2, littleKids: 0 })).toBe(236);
  });

  it("sizes dinners and describes the household for the crew", () => {
    const family = { men: 1, women: 1, teenBoys: 0, teenGirls: 0, kids: 1, littleKids: 1 };
    expect(servingsFor(family)).toBe(3.5); // 2 + 0.75 + 0.5 = 3.25 → 3½
    expect(describeHousehold(family)).toBe("2 adults, 1 child aged 6–11 and 1 little kid aged 1–5");
    expect(describeHousehold(DEFAULT_MEMBERS)).toBe("2 adults and 1 teenager (eats like an adult and a half)");
  });
});
