import { describe, expect, it } from "vitest";
import { adjustPlan, mergeIngredients, priceBoard, resolvePlan, planSchema, pricePlan, removeMeals, validatePlan, PlanInput, Product } from "./meal-plan";

const thighs: Product = { productId: "1", name: "Heritage Farm Chicken Thighs", size: "1 lb", price: 3.99 };
const fishSauce: Product = { productId: "2", name: "Dynasty Fish Sauce", size: "6.7 fl oz", price: 3.49 };
const rice: Product = { productId: "3", name: "Jasmine Rice", size: "2 lb", price: 4.5 };

const plan: PlanInput = {
  meals: [
    {
      day: "Monday",
      name: "Thai basil chicken",
      servings: 3.5,
      ingredients: [
        { name: "chicken thighs", amount: 1.5, unit: "lb", pantry: false },
        { name: "fish sauce", amount: 2, unit: "tbsp", pantry: false },
        { name: "salt", amount: 1, unit: "tsp", pantry: true },
      ],
    },
    {
      day: "Tuesday",
      name: "Chicken fried rice",
      servings: 3.5,
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
    expect(planSchema.safeParse({ meals: [{ day: "Mon", name: "Tacos", servings: 3, ingredients: [] }] }).success).toBe(false);
    expect(planSchema.safeParse({ meals: [{ day: "Mon", name: "Tacos", servings: 3 }] }).success).toBe(false);
    expect(planSchema.safeParse(plan).success).toBe(true);
  });

  it("rejects plans that break the rules", () => {
    const eightDays = { meals: Array.from({ length: 8 }, (_, d) => ({ ...plan.meals[0], day: `Day ${d + 1}` })) };
    expect(validatePlan(eightDays)).toMatch(/at most 7 days/);
    const onlyPantry = { meals: [{ day: "Mon", name: "Salt", servings: 3.5, ingredients: [plan.meals[0].ingredients[2]] }] };
    expect(validatePlan(onlyPantry)).toMatch(/at least one ingredient/);
    expect(validatePlan(plan)).toBeNull();
  });

  it("sends back dinners sized too small for the household", () => {
    expect(validatePlan(plan, 3.5)).toBeNull();
    expect(validatePlan(plan, 4)).toBeNull(); // half a serving of slack
    const forTwo = { meals: [{ ...plan.meals[0], servings: 2 }] };
    expect(validatePlan(forTwo, 3.5)).toMatch(/Size every dinner for 3.5 servings.*Thai basil chicken serves 2/);
    expect(validatePlan(plan, 5)).toMatch(/Size every dinner for 5 servings/); // leftovers on
  });
});

describe("household meal size", () => {
  it("counts the teen as 1.5 and adds lunch leftovers when asked", async () => {
    const { targetServings, formatServings } = await import("./household");
    expect(targetServings()).toBe(3.5);
    expect(targetServings({ servings: 3.5, leftovers: true })).toBe(5);
    expect(formatServings(3.5)).toBe("3½");
    expect(formatServings(5)).toBe("5");
  });
});

describe("removing a meal from the card", () => {
  it("re-prices without that meal and drops items only it used", () => {
    const priced = pricePlan(plan, products, 200);
    const withoutTuesday = removeMeals(priced, new Set([1]));
    expect(withoutTuesday.meals.map((m) => m.name)).toEqual(["Thai basil chicken"]);
    // 1.5 lb of thighs now → 2 packs; rice and garlic are gone.
    expect(withoutTuesday.items.map((i) => i.name)).toEqual(["chicken thighs", "fish sauce", "salt"]);
    expect(withoutTuesday.total).toBe(11.47); // 2 × $3.99 + $3.49
    expect(withoutTuesday.fits).toBe(true);
  });
});

describe("pantry staples you're out of", () => {
  it("get priced and counted once you mark them as needed", () => {
    const priced = pricePlan(plan, products, 200);
    expect(priced.items.find((i) => i.name === "salt")).toMatchObject({ pantry: true, cost: 0 });

    const salt: Product = { productId: "9", name: "Morton Salt", size: "26 oz", price: 1.29, suggestedPacks: 1 };
    const adjusted = adjustPlan(priced, new Set(), new Map([["salt", salt]]));
    expect(adjusted.items.find((i) => i.name === "salt")).toMatchObject({ pantry: false, packs: 1, cost: 1.29 });
    expect(adjusted.total).toBe(21.25); // 19.96 + 1.29
  });

  it("works together with removing a meal", () => {
    const priced = pricePlan(plan, products, 200);
    const salt: Product = { productId: "9", name: "Morton Salt", size: "26 oz", price: 1.29, suggestedPacks: 1 };
    expect(adjustPlan(priced, new Set([1]), new Map([["salt", salt]])).total).toBe(12.76); // 11.47 + 1.29
  });
});

describe("dinners from My Recipes", () => {
  const curry = {
    title: "Thai Green Curry",
    servings: 4,
    ingredients: [
      { name: "chicken thighs", amount: 2, unit: "lb", pantry: false },
      { name: "canned coconut milk", amount: 1, unit: "ct", pantry: false },
      { name: "fish sauce", amount: 2, unit: "tbsp", pantry: false },
      { name: "vegetable oil", amount: 1, unit: "tbsp", pantry: true },
    ],
  };
  const scale = (ings: typeof curry.ingredients, from: number, to: number) =>
    ings.map((i) => ({ ...i, amount: Math.round(i.amount * (to / from) * 100) / 100 }));
  const pantry = { have: new Set(["fish sauce"]), out: new Set(["vegetable oil"]) };

  it("fills in the recipe's ingredients, scaled by code, with pantry flags from My Pantry", () => {
    const r = resolvePlan(
      { meals: [{ day: "Mon", name: "Green curry", servings: 3.5, recipeId: "abc" }] },
      new Map([["abc", curry]]),
      pantry,
      scale,
    );
    if ("error" in r) throw new Error(r.error);
    const ings = r.plan.meals[0].ingredients;
    expect(ings.find((i) => i.name === "chicken thighs")?.amount).toBe(1.75); // 2 lb for 4 → 1.75 lb for 3½
    expect(ings.find((i) => i.name === "fish sauce")?.pantry).toBe(true); // have it
    expect(ings.find((i) => i.name === "vegetable oil")?.pantry).toBe(false); // out of it → buy
  });

  it("doesn't buy things made earlier in the recipe", () => {
    const beans = {
      title: "Garlic green beans",
      servings: 2,
      ingredients: [
        { name: "green beans", amount: 12, unit: "oz", pantry: false },
        { name: "garlic oil", amount: 1, unit: "tbsp", pantry: false, madeInRecipe: true },
      ],
    };
    const r = resolvePlan({ meals: [{ day: "Mon", name: "Beans", servings: 5, recipeId: "b" }] }, new Map([["b", beans]]), pantry, scale);
    if ("error" in r) throw new Error(r.error);
    expect(r.plan.meals[0].ingredients.map((i) => i.name)).toEqual(["green beans"]);
  });

  it("sends back an unknown recipe id or a dinner with nothing in it", () => {
    expect(resolvePlan({ meals: [{ day: "Mon", name: "X", servings: 3.5, recipeId: "nope" }] }, new Map(), pantry, scale)).toMatchObject({ error: expect.stringMatching(/isn't in My Recipes/) });
    expect(resolvePlan({ meals: [{ day: "Mon", name: "Tacos", servings: 3.5 }] }, new Map(), pantry, scale)).toMatchObject({ error: expect.stringMatching(/needs ingredients/) });
  });
});

describe("the shopping list follows the board", () => {
  const curry = {
    name: "Thai basil chicken",
    servings: 3.5,
    ingredients: plan.meals[0].ingredients,
    products: [{ name: "chicken thighs", product: thighs }, { name: "fish sauce", product: fishSauce }],
  };
  const friedRice = {
    name: "Chicken fried rice",
    servings: 3.5,
    ingredients: plan.meals[1].ingredients,
    products: [{ name: "Chicken thighs", product: thighs }, { name: "jasmine rice", product: rice }, { name: "garlic", product: null }],
  };

  it("prices only scheduled dinners, merging shared ingredients", () => {
    const priced = priceBoard([{ ...curry, dayIndex: 0 }, { ...friedRice, dayIndex: 2 }], 200)!;
    expect(priced.total).toBe(19.96); // same as pricing the two-dinner plan directly
    expect(priced.items.find((i) => i.name === "chicken thighs")?.packs).toBe(3);
  });

  it("leaves Ideas out, and returns nothing when no dinner is scheduled", () => {
    expect(priceBoard([{ ...curry, dayIndex: 0 }, { ...friedRice }], 200)!.total).toBe(11.47); // fried rice is an Idea
    expect(priceBoard([{ ...curry }], 200)).toBeNull();
    expect(priceBoard([{ name: "old plan dinner", dayIndex: 1 }], 200)).toBeNull(); // no stored ingredients
  });
});

describe("sale savings", () => {
  it("counts (regular − sale) × packs and totals it, leaving the plan total at the sale price", () => {
    const onSale: Product = { ...thighs, regularPrice: 5.49 };
    const products = new Map<string, Product | null>([["chicken thighs", onSale], ["fish sauce", fishSauce], ["jasmine rice", rice]]);
    const priced = pricePlan(plan, products, 100);
    const item = priced.items.find((i) => i.name.toLowerCase() === "chicken thighs")!;
    expect(item.saved).toBeCloseTo(1.5 * item.packs, 2);
    expect(item.cost).toBeCloseTo(3.99 * item.packs, 2);
    expect(priced.savings).toBeCloseTo(item.saved, 2);
    expect(priced.items.find((i) => i.name === "fish sauce")!.saved).toBe(0);
  });

  it("is zero with no sale items", () => {
    const priced = pricePlan(plan, new Map([["chicken thighs", thighs]]), 100);
    expect(priced.savings).toBe(0);
  });
});
