import { describe, expect, it } from "vitest";
import { parseJsonLdRecipe } from "./parseJsonLdRecipe";
import { extractVideoId } from "./youtubeUrlParser";
import { safeUrl } from "./safe-url";
import { scaleIngredients } from "./scale";

describe("reading a recipe website", () => {
  it("finds the recipe in the page's built-in data, including @graph pages", () => {
    const html = `<html><script type="application/ld+json">${JSON.stringify({
      "@graph": [
        { "@type": "WebPage", name: "Home" },
        {
          "@type": "Recipe",
          name: "Thai Green Curry",
          image: ["https://example.com/curry.jpg"],
          recipeYield: ["4", "4 people"],
          prepTime: "PT10M",
          cookTime: "PT25M",
          recipeIngredient: ["4 tbsp green curry paste", "1 can coconut milk"],
          recipeInstructions: [
            { "@type": "HowToStep", text: "Heat oil." },
            { "@type": "HowToStep", text: "Add curry paste." },
          ],
        },
      ],
    })}</script></html>`;
    const r = parseJsonLdRecipe(html)!;
    expect(r).toMatchObject({ title: "Thai Green Curry", servings: 4, prepTime: 10, cookTime: 25, imageUrl: "https://example.com/curry.jpg" });
    expect(r.ingredients.map((i) => i.raw)).toEqual(["4 tbsp green curry paste", "1 can coconut milk"]);
    expect(r.instructions).toEqual(["Heat oil.", "Add curry paste."]);
  });

  it("reads steps grouped into sections", () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      "@type": "Recipe",
      name: "Creamy Miso Chicken",
      recipeIngredient: ["2 lb chicken"],
      recipeInstructions: [
        { "@type": "HowToSection", name: "Make the sauce", itemListElement: [{ "@type": "HowToStep", text: "Whisk miso." }, { "@type": "HowToStep", text: "Add cream." }] },
        { "@type": "HowToSection", name: "Cook", itemListElement: [{ "@type": "HowToStep", text: "Sear chicken." }] },
      ],
    })}</script>`;
    expect(parseJsonLdRecipe(html)!.instructions).toEqual(["Whisk miso.", "Add cream.", "Sear chicken."]);
  });

  it("returns null for pages without a recipe", () => {
    expect(parseJsonLdRecipe("<html><p>No recipe here</p></html>")).toBeNull();
  });
});

describe("YouTube links", () => {
  it("finds the video id in every link style", () => {
    for (const url of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=42s",
    ]) {
      expect(extractVideoId(url)).toBe("dQw4w9WgXcQ");
    }
  });
});

describe("link safety", () => {
  it("allows normal websites and refuses local or private addresses", () => {
    expect(safeUrl("https://www.recipetineats.com/thai-green-curry/")?.hostname).toBe("www.recipetineats.com");
    for (const bad of ["http://localhost:3000", "http://127.0.0.1/x", "http://192.168.1.10", "http://10.0.0.5", "http://169.254.169.254/latest", "file:///etc/passwd", "ftp://x.com", "not a url", "https://user:pw@site.com"]) {
      expect(safeUrl(bad)).toBeNull();
    }
  });
});

describe("scaling a recipe to your household", () => {
  it("scales a 4-serving recipe to 3½ servings", () => {
    const ings = [
      { raw: "2 lb chicken thighs", name: "chicken thighs", amount: 2, unit: "lb", pantry: false },
      { raw: "1 can coconut milk", name: "canned coconut milk", amount: 1, unit: "ct", pantry: false },
      { raw: "12 oz rice noodles", name: "rice noodles", amount: 12, unit: "oz", pantry: false },
    ];
    expect(scaleIngredients(ings, 4, 3.5).map((i) => i.amount)).toEqual([1.75, 1, 11]); // can't buy 0.88 cans
    const counted = [
      { raw: "3 chicken breasts", name: "chicken breasts", amount: 3, unit: "ct", pantry: false },
      { raw: "2 garlic cloves", name: "garlic", amount: 2, unit: "clove", pantry: false },
      { raw: "pinch of salt", name: "salt", amount: 1, unit: "pinch", pantry: true },
    ];
    expect(scaleIngredients(counted, 4, 3.5).map((i) => i.amount)).toEqual([3, 2, 1]); // 2.63 → 3, 1.75 → 2, pinch stays
    const frying = [{ raw: "3 cups oil for frying", name: "vegetable oil", amount: 3, unit: "cup", pantry: true, fixed: true }];
    expect(scaleIngredients(frying, 2, 5)[0].amount).toBe(3); // the pot needs 3 cups for 2 or for 5
    expect(scaleIngredients(ings, 4, 5)[0].amount).toBe(2.5);
    expect(scaleIngredients(ings, 0, 5)).toBe(ings); // unknown servings: leave as-is
  });
});
