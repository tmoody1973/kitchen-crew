import { describe, expect, it } from "vitest";
import { toFoodHelp } from "./food-help";

describe("food help listings", () => {
  it("merges duplicates from different directories and sorts nearest first", () => {
    const out = toFoodHelp(
      [
        { name: "Siloah Food Pantry", address: "3721 N. 21st Street", city: "Milwaukee", state: "WI", distance: 0.7, resource_type: "food_pantry" },
        { name: "The Jewish Community Pantry", address: "2900 W Center Street", city: "Milwaukee", state: "WI", distance: 1, phone: "(414) 967-8353", accepts_walkins: 1 },
        { name: "Jewish Community Pantry", address: "2900 W Center St", city: "Milwaukee", distance: 1 },
        { name: "Emmaus Lutheran Food Pantry", address: "2818 N 23rd St.", distance: 0.5, website: "https://example.org", last_verified_date: "2026-04-23", resource_type: "soup_kitchen" },
      ],
      5,
    );
    expect(out.map((o) => o.name)).toEqual(["Emmaus Lutheran Food Pantry", "Siloah Food Pantry", "The Jewish Community Pantry"]);
    expect(out[0]).toMatchObject({ kind: "Free meals", website: "https://example.org", verified: "2026-04-23", miles: 0.5 });
    expect(out[2]).toMatchObject({ phone: "(414) 967-8353", walkIns: true });
  });

  it("caps the list", () => {
    expect(toFoodHelp([{ name: "A", address: "1 X" }, { name: "B", address: "2 Y" }], 1)).toHaveLength(1);
  });
});
