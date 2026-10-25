// Proves the Kroger API works before the app depends on it.
// Run: node --env-file=.env.local scripts/kroger-probe.mjs "chicken thighs"
const { KROGER_CLIENT_ID, KROGER_CLIENT_SECRET, KROGER_ZIP } = process.env;
const term = process.argv[2] ?? "chicken thighs";
const API = "https://api.kroger.com/v1";

const tokenRes = await fetch(`${API}/connect/oauth2/token`, {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization: "Basic " + Buffer.from(`${KROGER_CLIENT_ID}:${KROGER_CLIENT_SECRET}`).toString("base64"),
  },
  body: "grant_type=client_credentials&scope=product.compact",
});
console.log("token:", tokenRes.status);
const { access_token, expires_in } = await tokenRes.json();
console.log("expires_in (s):", expires_in);
const auth = { Authorization: `Bearer ${access_token}`, Accept: "application/json" };

const locRes = await fetch(`${API}/locations?filter.zipCode.near=${KROGER_ZIP}&filter.limit=1`, { headers: auth });
const store = (await locRes.json()).data?.[0];
console.log("locations:", locRes.status, "→", store?.chain, store?.name, "|", store?.address?.city, "| locationId:", store?.locationId);

const prodRes = await fetch(
  `${API}/products?filter.term=${encodeURIComponent(term)}&filter.locationId=${store.locationId}&filter.limit=1`,
  { headers: auth },
);
const product = (await prodRes.json()).data?.[0];
console.log("products:", prodRes.status, "→", product?.description, "|", product?.items?.[0]?.size);
console.log("price:", JSON.stringify(product?.items?.[0]?.price ?? null));
