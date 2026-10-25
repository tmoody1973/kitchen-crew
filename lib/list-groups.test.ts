import { describe, expect, it } from "vitest";
import { groupByDinner, groupByPlan } from "./list-groups";

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

describe("groupByPlan", () => {
  const ing2 = (name: string, pantry = false) => ({ name, pantry });
  const meals = [
    { name: "Mongolian Beef", dayIndex: 3, planId: "p2", ingredients: [ing2("flank steak"), ing2("rice")] },
    { name: "Gochujang Chicken", dayIndex: 0, planId: "p1", ingredients: [ing2("chicken thighs"), ing2("rice")] },
    { name: "Bibimbap", dayIndex: 1, planId: "p1", ingredients: [ing2("rice"), ing2("eggs"), ing2("salt", true)] },
    { name: "Old Tacos", dayIndex: 5, ingredients: [ing2("tortillas")] }, // planned before plans were tracked
    { name: "Someday Soup", planId: "p3", ingredients: [ing2("leeks")] }, // an Idea: not on the list
  ];
  const listRows = [
    { name: "chicken thighs", estimate: 6.99, packs: 2 },
    { name: "rice", estimate: 3.0, paid: 2.5 },
    { name: "eggs", estimate: 4.29 },
    { name: "flank steak", estimate: 11.0 },
    { name: "tortillas" },
    { name: "salt", estimate: 1 },
    { name: "sparkling water", estimate: 5 },
  ];
  const groups = groupByPlan(listRows, meals);

  it("one group per plan in day order, titled by its dinners, then earlier dinners, then the rest", () => {
    expect(groups.map((g) => [g.title, g.planId])).toEqual([
      ["Gochujang Chicken + Bibimbap", "p1"],
      ["Mongolian Beef", "p2"],
      ["Earlier dinners", undefined],
      ["Everything else", undefined],
    ]);
  });
  it("an item two plans share is one row shown in both, marked with the other plan", () => {
    const rice = (g: (typeof groups)[number]) => g.items.find((e) => e.item.name === "rice");
    expect(rice(groups[0])?.sharedWith).toEqual(["Mongolian Beef"]);
    expect(rice(groups[1])?.sharedWith).toEqual(["Gochujang Chicken + Bibimbap"]);
    expect(groups[0].items.map((e) => e.item.name)).toEqual(["chicken thighs", "rice", "eggs"]);
  });
  it("costs each plan with what was paid, else the estimate × packs (shared items count in each)", () => {
    expect(groups[0].cost).toBe(20.77); // 13.98 + 2.50 paid + 4.29
    expect(groups[1].cost).toBe(13.5); // 11 + 2.50
    expect(groups[2].cost).toBe(0); // tortillas: no price yet
  });
  it("pantry staples and Ideas don't pull rows into a plan", () => {
    expect(groups[3].items.map((e) => e.item.name)).toEqual(["salt", "sparkling water"]);
  });
});
