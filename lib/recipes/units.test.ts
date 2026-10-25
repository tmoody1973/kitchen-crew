import { describe, expect, it } from "vitest";
import { formatAmount, fraction } from "./units";

describe("US units (the default)", () => {
  it("turns grams into ounces/pounds, and watery liquids into cups", () => {
    expect(formatAmount(397, "g", "hot Italian sausage")).toBe("14 oz");
    expect(formatAmount(29, "g", "aged Parmesan cheese")).toBe("1 oz");
    expect(formatAmount(1200, "g", "chicken thighs")).toBe("2.6 lb");
    expect(formatAmount(583, "g", "water")).toBe("2½ cups");
    expect(formatAmount(250, "ml", "chicken stock")).toBe("1 cup");
    expect(formatAmount(15, "ml", "soy sauce")).toBe("1 tbsp");
    expect(formatAmount(2.92, "g", "granulated sugar")).toBe("3 g"); // too small to convert without density
  });

  it("writes US amounts as kitchen fractions", () => {
    expect(formatAmount(3.75, "cup", "vegetable oil")).toBe("3¾ cups");
    expect(formatAmount(0.63, "tsp", "table salt")).toBe("⅔ tsp");
    expect(formatAmount(2.5, "tbsp", "garlic oil")).toBe("2½ tbsp");
    expect(formatAmount(1.75, "lb", "chicken thighs")).toBe("1¾ lb");
    expect(formatAmount(20, "clove", "garlic")).toBe("20 cloves");
    expect(formatAmount(1, "to taste", "black pepper")).toBe("to taste");
  });
});

describe("metric units (toggle)", () => {
  it("turns US volumes into ml/l and weights into g/kg", () => {
    expect(formatAmount(3.75, "cup", "vegetable oil", "metric")).toBe("887 ml");
    expect(formatAmount(2.5, "tbsp", "garlic oil", "metric")).toBe("37 ml");
    expect(formatAmount(0.63, "tsp", "table salt", "metric")).toBe("3 ml");
    expect(formatAmount(1.75, "lb", "chicken thighs", "metric")).toBe("794 g");
    expect(formatAmount(30, "oz", "green beans", "metric")).toBe("850 g");
    expect(formatAmount(8, "cup", "water", "metric")).toBe("1.89 l");
  });

  it("leaves metric amounts and counts as they are", () => {
    expect(formatAmount(397.4, "g", "sausage", "metric")).toBe("397 g");
    expect(formatAmount(20, "clove", "garlic", "metric")).toBe("20 cloves");
    expect(formatAmount(1, "to taste", "salt", "metric")).toBe("to taste");
  });
});

describe("kitchen fractions", () => {
  it("rounds to the nearest quarter or third", () => {
    expect(fraction(2.46)).toBe("2½");
    expect(fraction(0.26)).toBe("¼");
    expect(fraction(1.33)).toBe("1⅓");
    expect(fraction(0.97)).toBe("1");
  });
});
