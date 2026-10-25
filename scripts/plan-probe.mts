// Runs the meal-plan pipeline the chat route uses, against real Kroger + Claude.
// Run: npx tsx --env-file=.env.local scripts/plan-probe.mts [storeId]
import { searchCandidates } from "../lib/kroger";
import { mergeIngredients, pricePlan, type PlanInput } from "../lib/meal-plan";
import { pickProducts } from "../lib/pick-products";

const storeId = process.argv[2] ?? "53400371";
const plan: PlanInput = {
  meals: [
    {
      day: "Monday",
      name: "Thai green curry with chicken",
      ingredients: [
        { name: "boneless skinless chicken thighs", amount: 1.5, unit: "lb", pantry: false },
        { name: "canned coconut milk", amount: 13.5, unit: "fl oz", pantry: false },
        { name: "green curry paste", amount: 4, unit: "tbsp", pantry: false },
        { name: "fish sauce", amount: 2, unit: "tbsp", pantry: false },
        { name: "jasmine rice", amount: 2, unit: "cup", pantry: false },
        { name: "vegetable oil", amount: 1, unit: "tbsp", pantry: true },
      ],
    },
    {
      day: "Tuesday",
      name: "Chicken fried rice",
      ingredients: [
        { name: "boneless skinless chicken thighs", amount: 1, unit: "lb", pantry: false },
        { name: "eggs", amount: 3, unit: "ct", pantry: false },
        { name: "green onions", amount: 1, unit: "bunch", pantry: false },
        { name: "frozen peas and carrots", amount: 12, unit: "oz", pantry: false },
      ],
    },
  ],
};

const toBuy = mergeIngredients(plan).filter((i) => !i.pantry);
// One search at a time, like the app.
const started = Date.now();
const candidates = [];
for (const i of toBuy) candidates.push({ name: i.name, dish: "", amountText: i.amountText, options: await searchCandidates(i.name, storeId) });
console.log(`searched ${toBuy.length} items one at a time in ${((Date.now() - started) / 1000).toFixed(1)} s`);
const products = await pickProducts(candidates);
const priced = pricePlan(plan, products, 200);

for (const item of priced.items) {
  console.log(
    item.pantry ? "  (pantry)" : "  ",
    item.name.padEnd(34),
    item.product ? `${item.product.name.slice(0, 44)} · ${item.product.size} → ${item.packs} × $${item.product.price} = $${item.cost}${item.exact ? "" : " (check amount)"}` : item.pantry ? "" : "NO PRICE",
  );
}
priced.meals.forEach((m) => console.log(`  ${m.day}: ${m.name} ~$${m.cost}`));
const sum = Math.round(priced.items.reduce((s, i) => s + i.cost, 0) * 100) / 100;
console.log(`total $${priced.total} | sum of items $${sum} | ${priced.total === sum ? "MATCH" : "MISMATCH"} | fits $200: ${priced.fits}`);
