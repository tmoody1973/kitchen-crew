import { describe, expect, it } from "vitest";
import { groupByDinner } from "./list-groups";

const ing = (name: string, pantry = false) => ({ name, pantry });
const dinners = [
  { name: "Mongolian Beef", dayIndex: 2, ingredients: [ing("flank steak"), ing("Green Onions"), ing("salt", true)] },
  { name: "Gochujang Chicken", dayIndex: 0, ingredients: [ing("chicken thighs"), ing("green onions"), ing("gochujang")] },
  { name: "An idea", ingredients: [ing("tofu")] }, // not scheduled: no day
];
const rows = [{ name: "flank steak" }, { name: "green onions " }, { name: "Chicken Thighs" }, { name: "gochujang" }, { name: "sparkling water" }, { name: "tofu" }];
const label = (d: { name: string; dayIndex: number }) => `Day ${d.dayIndex} · ${d.name}`;

describe("groupByDinner", () => {
  const groups = groupByDinner(rows, dinners, label);

  it("puts shared items first, naming the dinners in day order", () => {
    expect(groups[0]).toEqual({ title: "Shared by 2+ dinners", items: [{ item: { name: "green onions " }, dinners: ["Gochujang Chicken", "Mongolian Beef"] }] });
  });
  it("then one group per scheduled dinner, in day order, matching names loosely", () => {
    expect(groups.slice(1, 3).map((g) => [g.title, g.items.map((e) => e.item.name)])).toEqual([
      ["Day 0 · Gochujang Chicken", ["Chicken Thighs", "gochujang"]],
      ["Day 2 · Mongolian Beef", ["flank steak"]],
    ]);
  });
  it("ends with everything not from a scheduled dinner (Ideas don't count)", () => {
    expect(groups.at(-1)).toEqual({ title: "Everything else", items: [{ item: { name: "sparkling water" }, dinners: [] }, { item: { name: "tofu" }, dinners: [] }] });
  });
  it("leaves out empty groups", () => {
    expect(groupByDinner([{ name: "flank steak" }], dinners, label).map((g) => g.title)).toEqual(["Day 2 · Mongolian Beef"]);
  });
});
