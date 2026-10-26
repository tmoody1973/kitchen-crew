// Free food help near a ZIP (food pantries, free meals, school meal sites, WIC) from Feed America's public
// directory (feedam.org, a 501(c)(3); data CC BY 4.0, credit required). No key needed.
export type HelpMode = "free" | "school" | "summer" | "wic";
export type FoodHelp = {
  name: string;
  kind: string;
  address: string;
  phone?: string;
  website?: string;
  miles?: number;
  walkIns?: boolean;
  appointment?: boolean;
  verified?: string; // date the listing was last verified
};

export const CREDIT = "Directory: Feed America (feedam.org)";

const KIND: Record<string, string> = {
  food_pantry: "Food pantry",
  food_bank: "Food bank",
  soup_kitchen: "Free meals",
  meal_site: "Free meals",
  mobile_pantry: "Mobile pantry",
  community_fridge: "Community fridge",
  school_meal: "School meals",
  summer_meal: "Summer meals",
  wic_office: "WIC office",
};
const kindOf = (t: string) => KIND[t] ?? t.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

type Raw = Record<string, unknown>;

/** Directory rows → listings, merging duplicates that come from different source directories, nearest first. */
export function toFoodHelp(rows: Raw[], limit: number): FoodHelp[] {
  const seen = new Set<string>();
  const out: FoodHelp[] = [];
  for (const r of [...rows].sort((a, b) => Number(a.distance ?? 99) - Number(b.distance ?? 99))) {
    const name = String(r.name ?? "").trim();
    const street = String(r.address ?? "").trim();
    if (!name) continue;
    // "The Jewish Community Pantry" at "2900 W Center Street" = "Jewish Community Pantry" at "2900 W Center St"
    const key = `${name.toLowerCase().replace(/^the\s+/, "").replace(/[^a-z0-9]/g, "")}|${street.match(/^\d+/)?.[0] ?? street.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name,
      kind: kindOf(String(r.resource_type ?? "")),
      address: [street, r.city, r.state].filter(Boolean).join(", "),
      ...(r.phone ? { phone: String(r.phone) } : {}),
      ...(typeof r.website === "string" && /^https?:\/\//.test(r.website) ? { website: r.website } : {}),
      ...(r.distance !== undefined && r.distance !== null ? { miles: Number(r.distance) } : {}),
      ...(r.accepts_walkins === 1 ? { walkIns: true } : {}),
      ...(r.requires_appointment === 1 ? { appointment: true } : {}),
      ...(r.last_verified_date ? { verified: String(r.last_verified_date) } : {}),
    });
    if (out.length >= limit) break;
  }
  return out;
}

export async function findFoodHelp(zip: string, mode: HelpMode = "free", limit = 6): Promise<FoodHelp[]> {
  if (!/^\d{5}$/.test(zip)) throw new Error("ZIP must be 5 digits");
  const q = new URLSearchParams({ zip, mode, limit: String(limit * 2) });
  const res = await fetch(`https://feedam.org/api/resources/search?${q}`, { signal: AbortSignal.timeout(20_000), next: { revalidate: 21_600 } } as RequestInit);
  if (!res.ok) throw new Error(`Feed America search failed: ${res.status}`);
  const data = (await res.json()) as { resources?: Raw[] };
  return toFoodHelp(data.resources ?? [], limit);
}
