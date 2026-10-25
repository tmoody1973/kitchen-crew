import { describe, expect, it } from "vitest";
import { readBarcode } from "./barcode";

describe("readBarcode", () => {
  it("turns a UPC-A into Kroger's productId: drop the check digit, pad to 13", () => {
    expect(readBarcode("013000006408")).toEqual({ kind: "product", productId: "0001300000640" }); // Heinz ketchup
  });
  it("accepts the same UPC read as a 13-digit EAN with a leading 0", () => {
    expect(readBarcode("0013000006408")).toEqual({ kind: "product", productId: "0001300000640" });
  });
  it("accepts an EAN-13 from outside the US", () => {
    expect(readBarcode("4006381333931")).toEqual({ kind: "product", productId: "0400638133393" });
  });
  it("expands a short UPC-E (small packs) to the full UPC first", () => {
    // UPC-E 04252614 = UPC-A 042100005264
    expect(readBarcode("04252614")).toEqual({ kind: "product", productId: "0004210000526" });
  });
  it("reads the price from a store-printed sticker: 2 IIIII A PPPP C", () => {
    expect(readBarcode("212345019955")).toEqual({ kind: "sticker", cents: 1995 });
    expect(readBarcode("0212345019955")).toEqual({ kind: "sticker", cents: 1995 });
  });
  it("rejects misreads (wrong check digit) and junk", () => {
    expect(readBarcode("013000006409")).toBeNull();
    expect(readBarcode("212345019954")).toBeNull();
    expect(readBarcode("12345")).toBeNull();
    expect(readBarcode("abc")).toBeNull();
  });
  it("ignores spaces and dashes from typed codes", () => {
    expect(readBarcode("0 13000 00640 8")).toEqual({ kind: "product", productId: "0001300000640" });
  });
});
