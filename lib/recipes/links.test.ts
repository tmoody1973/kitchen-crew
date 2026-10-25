import { describe, expect, it } from "vitest";
import { recipeLinks } from "./links";

// Lines taken from real descriptions in Tarik's "recipes" playlist.
describe("recipeLinks", () => {
  it("finds the written-recipe link and skips the freebie page", () => {
    const d = `Full recipe with printable card: https://jasonfarmer.com/din-tai-fung-green-beans/
Free recipe pack, six takeout dishes that taste like the restaurant: https://jasonfarmer.com/free-recipes/
My wok: https://amzn.to/3abc`;
    expect(recipeLinks(d)).toEqual(["https://jasonfarmer.com/din-tai-fung-green-beans/"]);
  });

  it("accepts a bare link whose address says recipe", () => {
    expect(recipeLinks("https://jasonfarmer.com/panda-express-black-pepper-chicken-recipe/")).toEqual([
      "https://jasonfarmer.com/panda-express-black-pepper-chicken-recipe/",
    ]);
  });

  it("skips sponsors and blog home pages, keeps the real recipe", () => {
    const d = `This easy one-pot spaghetti recipe is BETTER. Go to http://seed.com/brian and use code 25BRIAN
📝 DETAILED RECIPES ON MY BLOG: https://brianlagerstrom.com/recipes
FULL RECIPE AND INSTRUCTIONS: https://www.brianlagerstrom.com/recipes/faster-better-spaghetti-amp-meat-sauce`;
    expect(recipeLinks(d)).toEqual(["https://www.brianlagerstrom.com/recipes/faster-better-spaghetti-amp-meat-sauce"]);
  });

  it("trims punctuation and handles links inside parentheses", () => {
    const d = "INSTRUCTIONS (visit https://www.brianlagerstrom.com/recipes/cajun-gumbo for detailed recipe)";
    expect(recipeLinks(d)).toEqual(["https://www.brianlagerstrom.com/recipes/cajun-gumbo"]);
  });

  it("ignores social, shopping, and YouTube links even on recipe lines", () => {
    const d = `Recipe video part 2: https://youtu.be/abc123
Recipe on Instagram: https://instagram.com/p/xyz
RECIPE: https://thewoksoflife.com/tan-tan-ramen/`;
    expect(recipeLinks(d)).toEqual(["https://thewoksoflife.com/tan-tan-ramen/"]);
  });

  it("skips sponsor links that come long after an intro mentioning the recipe", () => {
    const d =
      "Everyone knows the best chili is simmered for hours, but I use a few tricks in this super-fast chili recipe in around 30 minutes. Thank you Wildgrain for sponsoring. Visit http://wildgrain.com/brian and use code BRIAN";
    expect(recipeLinks(d)).toEqual([]);
    expect(recipeLinks("This one pot rigatoni recipe tastes like it took way more work than it did. Grab a bottle at https://drinklmnt.com/brian")).toEqual([]);
  });

  it("skips category pages", () => {
    expect(recipeLinks("Side Dishes: https://www.billyparisi.com/category/recipes/side-dishes/")).toEqual([]);
  });

  it("returns nothing when there's no recipe link", () => {
    expect(recipeLinks("Knife I use: https://geni.us/knife\nFollow me https://tiktok.com/@me")).toEqual([]);
  });
});
