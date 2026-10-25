import { describe, expect, it } from "vitest";
import { mergeIngredients, planSchema, pricePlan, validatePlan, PlanInput, Product } from "./meal-plan";

const thighs: Product = { productId: "1", name: "Heritage Farm Chicken Thighs", size: "1 lb", price: 3.99 };
const fishSauce: Product = { productId: "2", name: "Dynasty Fish Sauce", size: "6.7 fl oz", price: 3.49 };
const rice: Product = { productId: "3", name: "Jasmine Rice", size: "2 lb", price: 4.5 };

const plan: PlanInput = {
  meals: [
    {
      day: "Monday",
      name: "Thai basil chicken",
      ingredients: [
        { name: "chicken thighs", amount: 1.5, unit: "lb", pantry: false },
        { name: "fish sauce", amount: 2, unit: "tbsp", pantry: false },
        { name: "salt", amount: 1, unit: "tsp", pantry: true },
      ],
    },
    {
      day: "Tuesday",
      name: "Chicken fried rice",
      ingredients: [
        { name: "Chicken thighs", amount: 1, unit: "lb", pantry: false },
        { name: "jasmine rice", amount: 2, unit: "cup", pantry: false },
        { name: "garlic", amount: 3, unit: "cloves", pantry: false },
      ],
    },
  ],
};

const products = new Map<string, Product | null>([
  ["chicken thighs", thighs],
  ["fish sauce", fishSauce],
  ["jasmine rice", rice],
  ["garlic", null], // no price found
]);

describe("pricing a meal plan", () => {
  it("merges the same ingredient across meals", () => {
    const items = mergeIngredients(plan);
    expect(items.map((i) => i.name)).toEqual(["chicken thighs", "fish sauce", "salt", "jasmine rice", "garlic"]);
    expect(items[0].amountText).toBe("1.5 lb + 1 lb");
  });

  it("buys whole packages and totals what you'd pay", () => {
    const priced = pricePlan(plan, products, 200);
    const item = (n: string) => priced.items.find((i) => i.name === n)!;
    expect(item("chicken thighs")).toMatchObject({ packs: 3, exact: true, cost: 11.97 }); // 2.5 lb → 3 × $3.99
    expect(item("fish sauce")).toMatchObject({ packs: 1, cost: 3.49 });
    expect(item("salt")).toMatchObject({ pantry: true, cost: 0 });
    expect(item("jasmine rice")).toMatchObject({ packs: 1, exact: false, cost: 4.5 }); // cups vs lb: check amount
    expect(item("garlic")).toMatchObject({ product: null, cost: 0 });
    expect(priced.total).toBe(19.96);
  });

  it("splits shared items between meals and the meals add up to the total", () => {
    const priced = pricePlan(plan, products, 200);
    expect(priced.meals[0].cost).toBe(10.67); // 1.5/2.5 of $11.97 + $3.49
    expect(priced.meals[1].cost).toBe(9.29); // 1/2.5 of $11.97 + $4.50
    expect(priced.meals[0].cost + priced.meals[1].cost).toBeCloseTo(priced.total, 2);
  });

  it("says whether the plan fits what's left this week", () => {
    expect(pricePlan(plan, products, 25)).toMatchObject({ fits: true, overBy: 0 });
    expect(pricePlan(plan, products, 15)).toMatchObject({ fits: false, overBy: 4.96 });
  });
});

describe("malformed plans are sent back to Claude", () => {
  it("rejects plans the schema can't accept", () => {
    expect(planSchema.safeParse({ meals: [] }).success).toBe(false);
    expect(planSchema.safeParse({ meals: [{ day: "Mon", name: "Tacos", ingredients: [] }] }).success).toBe(false);
    expect(planSchema.safeParse({ meals: [{ day: "Mon", name: "Tacos" }] }).success).toBe(false);
    expect(planSchema.safeParse(plan).success).toBe(true);
  });

  it("rejects plans that break the rules", () => {
    const eightDays = { meals: Array.from({ length: 8 }, (_, d) => ({ ...plan.meals[0], day: `Day ${d + 1}` })) };
    expect(validatePlan(eightDays)).toMatch(/at most 7 days/);
    const onlyPantry = { meals: [{ day: "Mon", name: "Salt", ingredients: [plan.meals[0].ingredients[2]] }] };
    expect(validatePlan(onlyPantry)).toMatch(/at least one ingredient/);
    expect(validatePlan(plan)).toBeNull();
  });
});
