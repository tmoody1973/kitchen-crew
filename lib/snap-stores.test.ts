import { describe, expect, it } from "vitest";
import { milesBetween, toSnapStores } from "./snap-stores";

const at = (name: string, type: string, lat: number, lng: number, incentive = " ") => ({
  attributes: { Store_Name: name, Store_Street_Address: "1 Main St ", City: "MILWAUKEE", Store_Type: type, Latitude: lat, Longitude: lng, Incentive_Program: incentive },
});

describe("SNAP stores", () => {
  it("measures miles", () => {
    expect(milesBetween({ lat: 43.02, lng: -87.93 }, { lat: 43.02, lng: -87.93 })).toBe(0);
    expect(Math.round(milesBetween({ lat: 43, lng: -88 }, { lat: 44, lng: -88 }))).toBe(69);
  });

  it("keeps food stores, closest first, and drops the 'Waiver' label", () => {
    const from = { lat: 43.02, lng: -87.93 };
    const out = toSnapStores(
      [at("FAR MARKET", "Supermarket", 43.05, -87.93, "Double Up Food Bucks"), at("CORNER SHOP", "Convenience Store", 43.02, -87.93), at("EL REY", "Super Store", 43.021, -87.933, "Waiver")],
      from,
      5,
    );
    expect(out.map((s) => s.name)).toEqual(["El Rey", "Far Market"]);
    expect(out[0].incentive).toBeUndefined();
    expect(out[1].incentive).toBe("Double Up Food Bucks");
    expect(out[0].address).toBe("1 Main St, Milwaukee");
    expect(toSnapStores([at("PETE'S MARKETPLACE", "Super Store", 43.02, -87.93), at("FRESH THYME MARKET 701MKE", "Super Store", 43.02, -87.93)], from, 5).map((s) => s.name)).toEqual(["Pete's Marketplace", "Fresh Thyme Market"]);
  });
});
