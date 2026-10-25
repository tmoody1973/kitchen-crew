// What a scanned (or typed) grocery barcode means: a packaged product to look up at Kroger,
// or a store-printed sticker (meat, deli, produce) with the price inside it.

export type Scan = { kind: "product"; productId: string } | { kind: "sticker"; cents: number };

/** GS1 check digit: weights 3,1,3,1… from the right, over everything but the last digit. */
function checkDigitOk(code: string): boolean {
  const body = code.slice(0, -1);
  let sum = 0;
  for (let i = 0; i < body.length; i++) sum += Number(body[body.length - 1 - i]) * (i % 2 === 0 ? 3 : 1);
  return (10 - (sum % 10)) % 10 === Number(code.at(-1));
}

/** Short UPC-E (8 digits, small packs) → full 12-digit UPC-A. */
function expandUpcE(e: string): string {
  const [ns, d1, d2, d3, d4, d5, d6, check] = e;
  const middle =
    d6 <= "2" ? `${d1}${d2}${d6}0000${d3}${d4}${d5}`
    : d6 === "3" ? `${d1}${d2}${d3}00000${d4}${d5}`
    : d6 === "4" ? `${d1}${d2}${d3}${d4}00000${d5}`
    : `${d1}${d2}${d3}${d4}${d5}0000${d6}`;
  return `${ns}${middle}${check}`;
}

export function readBarcode(raw: string): Scan | null {
  let code = raw.replace(/[\s-]/g, "");
  if (!/^\d+$/.test(code)) return null;
  if (code.length === 8) code = expandUpcE(code);
  if (code.length === 13 && code.startsWith("0")) code = code.slice(1); // a UPC-A read as EAN-13
  if ((code.length !== 12 && code.length !== 13) || !checkDigitOk(code)) return null;
  // Store-printed sticker: 2 IIIII A PPPP C (item number, price check, price in cents).
  if (code.length === 12 && code.startsWith("2")) return { kind: "sticker", cents: Number(code.slice(7, 11)) };
  return { kind: "product", productId: code.slice(0, -1).padStart(13, "0") };
}
