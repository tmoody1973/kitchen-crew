// Stores that take SNAP near a point, from USDA's SNAP Retailer Locator (public ArcGIS feed, no key).
const FEED = "https://services1.arcgis.com/RLQu0rK7h4kbsBq5/arcgis/rest/services/snap_retailer_location_data/FeatureServer/0/query";
// Places to do a grocery shop; convenience stores and "Other" are left out.
const FOOD_TYPES = ["Supermarket", "Super Store", "Grocery Store", "Farmers and Markets", "Specialty Store"];

export type SnapStore = { name: string; address: string; type: string; miles: number; incentive?: string };

type Feature = { attributes: Record<string, string | number | null> };

/** Miles between two points (haversine). */
export function milesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// "PETE'S MARKETPLACE" → "Pete's Marketplace" (capitalize after spaces only, so apostrophes stay lowercase).
const title = (s: string) => s.toLowerCase().replace(/(^|[\s-])(\w)/g, (_, sp, c) => sp + c.toUpperCase()).replace(/\s+/g, " ").trim();
// USDA appends store numbers ("Fresh Thyme Market 701mke", "Aldi 64087"); drop a trailing token with digits.
const storeName = (s: string) => title(s).replace(/\s+\S*\d\S*$/, "");

/** Turns feed rows into the closest food stores first; "Waiver" isn't a shopper-facing program, so it's dropped. */
export function toSnapStores(features: Feature[], from: { lat: number; lng: number }, limit: number): SnapStore[] {
  return features
    .map(({ attributes: a }) => {
      const type = String(a.Store_Type ?? "");
      const incentive = String(a.Incentive_Program ?? "").trim();
      return {
        name: storeName(String(a.Store_Name ?? "")),
        address: `${String(a.Store_Street_Address ?? "").trim()}, ${title(String(a.City ?? ""))}`,
        type,
        miles: Math.round(milesBetween(from, { lat: Number(a.Latitude), lng: Number(a.Longitude) }) * 10) / 10,
        ...(incentive && incentive.toLowerCase() !== "waiver" ? { incentive } : {}),
      };
    })
    .filter((s) => s.name && FOOD_TYPES.includes(s.type))
    .sort((a, b) => a.miles - b.miles)
    .slice(0, limit);
}

export async function snapStoresNear(from: { lat: number; lng: number }, miles = 3, limit = 8): Promise<SnapStore[]> {
  const q = new URLSearchParams({
    where: `Store_Type IN (${FOOD_TYPES.map((t) => `'${t}'`).join(",")})`,
    geometry: `${from.lng},${from.lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    distance: String(miles),
    units: "esriSRUnit_StatuteMile",
    outFields: "Store_Name,Store_Street_Address,City,Store_Type,Latitude,Longitude,Incentive_Program",
    returnGeometry: "false",
    resultRecordCount: "200",
    f: "json",
  });
  const res = await fetch(`${FEED}?${q}`, { signal: AbortSignal.timeout(15_000), next: { revalidate: 86_400 } } as RequestInit);
  if (!res.ok) throw new Error(`SNAP retailer feed failed: ${res.status}`);
  const data = (await res.json()) as { features?: Feature[]; error?: unknown };
  if (data.error) throw new Error("SNAP retailer feed error");
  return toSnapStores(data.features ?? [], from, limit);
}
