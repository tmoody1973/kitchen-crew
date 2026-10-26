import { describe, expect, it } from "vitest";
import { rollUp, type WeekTotals } from "./history";
import { actualPaid, computeTally, receiptExtra } from "./tally";

const wk = (date: string, actual: number, planned = 100, sample = false): WeekTotals => ({
  weekId: date, startDate: new Date(`${date}T12:00:00`).getTime(), budget: 200, planned, shelf: actual, actual, receipts: 1, sample,
});

describe("history roll-up", () => {
  const weeks = [wk("2026-07-06", 150), wk("2026-07-27", 160), wk("2026-08-03", 170), wk("2026-10-19", 180, 120, true)];

  it("groups weeks by the month they start in, newest first", () => {
    const months = rollUp(weeks, "month");
    expect(months.map((m) => [m.label, m.weeks, m.actual])).toEqual([
      ["October 2026", 1, 180],
      ["August 2026", 1, 170],
      ["July 2026", 2, 310],
    ]);
    expect(months[2].budget).toBe(400);
  });

  it("groups by quarter and keeps the sample flag only when every week is a sample", () => {
    const q = rollUp(weeks, "quarter");
    expect(q.map((p) => [p.label, p.weeks, p.planned, p.sample])).toEqual([
      ["Q4 2026", 1, 120, true],
      ["Q3 2026", 3, 300, false],
    ]);
  });

  it("lists single weeks newest first", () => {
    expect(rollUp(weeks, "week")[0].label).toBe("Week of Oct 19, 2026");
  });
});

describe("receipts in the tally", () => {
  const items = [{ paid: 4.29, receiptId: "r1" }, { paid: 10, receiptId: "r1" }, { paid: 2.5 }, {}];
  const receipts = [{ total: 15.4 }];

  it("counts a receipt's total instead of the paid boxes it covers", () => {
    expect(computeTally(100, actualPaid(items, receipts), 0, 0).spent).toBe(17.9); // 15.40 + 2.50
  });

  it("reports tax and fees as the receipt minus its covered rows", () => {
    expect(receiptExtra(items, receipts)).toBe(1.11); // 15.40 − 14.29
    expect(receiptExtra([{ paid: 3 }], [])).toBe(0);
  });
});
