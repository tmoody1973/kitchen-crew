import { describe, expect, it } from "vitest";
import { computeTally, daysLeft, formatMoney, isWeekActive, rowStatus, estimateTotal } from "./tally";
import { pickImage, pickPrice, rankByRelevance } from "./kroger";
import { suggestedBudget } from "./usda";

const DAY = 24 * 60 * 60 * 1000;
const start = Date.UTC(2026, 9, 25, 9, 0);

describe("tally", () => {
  it("starts a fresh week with nothing spent and 7 days left", () => {
    expect(computeTally(200, [], start, start)).toEqual({
      budget: 200,
      spent: 0,
      left: 200,
      daysLeft: 7,
      status: "under",
    });
  });

  it("adds paid amounts, ignores empty boxes, and counts days down", () => {
    const t = computeTally(200, [11, undefined, 131], start, start + 3 * DAY);
    expect(t).toMatchObject({ spent: 142, left: 58, daysLeft: 4, status: "under" });
  });

  it("adds cents exactly", () => {
    expect(computeTally(1, [0.1, 0.2], start, start).spent).toBe(0.3);
  });

  it("says over budget once spending passes the budget", () => {
    expect(computeTally(200, [150, 60.5], start, start)).toMatchObject({ left: -10.5, status: "over" });
    expect(computeTally(200, [200], start, start).status).toBe("under");
  });

  it("ends the week after 7 days", () => {
    expect(isWeekActive(start, start + 7 * DAY - 1)).toBe(true);
    expect(isWeekActive(start, start + 7 * DAY)).toBe(false);
    expect(daysLeft(start, start + 6 * DAY + 23 * 60 * 60 * 1000)).toBe(1);
    expect(daysLeft(start, start + 9 * DAY)).toBe(0);
  });

  it("formats money for the tally line", () => {
    expect(formatMoney(142)).toBe("$142");
    expect(formatMoney(11.5)).toBe("$11.50");
    expect(formatMoney(-10.5)).toBe("-$10.50");
  });
});

describe("USDA suggested budget (2 adults + a 16-year-old, +5% for 3 people)", () => {
  it("matches the September 2026 report", () => {
    expect(suggestedBudget("low")).toBe(222); // (63.80 + 73.30 + 74.50) × 1.05 = 222.18
    expect(suggestedBudget("thrifty")).toBe(218); // (58.60 + 73.60 + 75.30) × 1.05 = 217.88
    expect(suggestedBudget("moderate")).toBe(276); // (77.60 + 91.90 + 93.10) × 1.05 = 275.73
    expect(suggestedBudget()).toBe(222); // default is low-cost
  });
});

describe("shopping list rows", () => {
  it("entering a paid price moves the tally", () => {
    const before = computeTally(200, [undefined, undefined], start, start);
    const after = computeTally(200, [11, undefined], start, start);
    expect(before).toMatchObject({ spent: 0, left: 200 });
    expect(after).toMatchObject({ spent: 11, left: 189 });
  });

  it("colors a row green at or under the estimate, orange over it", () => {
    expect(rowStatus(3.99, 3.99)).toBe("under");
    expect(rowStatus(3.99, 3.5)).toBe("under");
    expect(rowStatus(3.99, 4.25)).toBe("over");
    expect(rowStatus(undefined, 4)).toBe("none");
    expect(rowStatus(3.99, undefined)).toBe("none");
  });

  it("multiplies the package price by the packs to buy", () => {
    expect(estimateTotal(3.99, 2)).toBe(7.98);
    expect(estimateTotal(3.99)).toBe(3.99);
    expect(estimateTotal(undefined, 3)).toBeUndefined();
    expect(rowStatus(estimateTotal(3.99, 2), 7.5)).toBe("under");
  });

  it("uses Kroger's sale price when there is one", () => {
    expect(pickPrice({ regular: 3.99, promo: 2.99 })).toBe(2.99);
    expect(pickPrice({ regular: 3.99, promo: 0 })).toBe(3.99);
    expect(pickPrice({})).toBeNull();
    expect(pickPrice(undefined)).toBeNull();
  });

  it("shows the featured product photo, else the front one", () => {
    const sizes = (side: string) => [{ size: "small", url: `https://www.kroger.com/product/images/small/${side}/1` }];
    expect(pickImage([{ perspective: "back", sizes: sizes("back") }, { perspective: "front", featured: true, sizes: sizes("front") }])).toContain("/front/");
    expect(pickImage([{ perspective: "front", sizes: sizes("front") }])).toContain("/front/");
    expect(pickImage(undefined)).toBeUndefined();
  });
});

describe("smarter Kroger search", () => {
  const names = (list: { name: string }[]) => list.map((p) => p.name);

  it("shows only exact-phrase matches when there are some", () => {
    const results = [
      { name: "Louisiana® Fish Fry Products Tartar Sauce" },
      { name: "Fire & Smoke Society® Fish Monger Seafood Blend" },
      { name: "Dynasty® Premium Fish Sauce" },
      { name: "Ka-Me® Fish Sauce" },
    ];
    expect(names(rankByRelevance("fish sauce", results))).toEqual([
      "Dynasty® Premium Fish Sauce",
      "Ka-Me® Fish Sauce",
    ]);
  });

  it("matches plurals, keeps Kroger's order, and falls back when nothing matches exactly", () => {
    const results = [{ name: "Momofuku Soy & Scallion Noodles" }, { name: "Green Onion Bulb" }, { name: "Organic Green Onions" }];
    expect(names(rankByRelevance("green onions", results))).toEqual([
      "Green Onion Bulb",
      "Organic Green Onions",
    ]);
    expect(names(rankByRelevance("scallions", [{ name: "Green Onions" }, { name: "Leeks" }]))).toEqual(["Green Onions", "Leeks"]);
    expect(names(rankByRelevance("tomatoes", [{ name: "Ketchup" }, { name: "Roma Tomato" }]))[0]).toBe("Roma Tomato");
  });
});
