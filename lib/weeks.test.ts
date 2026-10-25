import { describe, expect, it } from "vitest";
import { currentWeek, dayLabel, nextWeekOf, openDays, todayIndex, DAY_MS, WEEK_MS } from "./weeks";

const start = Date.UTC(2026, 9, 25, 15, 0); // Sun Oct 25 2026, 10am CDT
const thisWeek = { id: "a", startDate: start };
const nextWeek = { id: "b", startDate: start + WEEK_MS };

describe("which week is this week", () => {
  it("picks the week whose 7 days include now, even when next week already exists", () => {
    expect(currentWeek([nextWeek, thisWeek], start + 2 * DAY_MS)?.id).toBe("a");
    expect(currentWeek([nextWeek, thisWeek], start + WEEK_MS + 1)?.id).toBe("b"); // next week takes over on its first day
    expect(currentWeek([thisWeek], start + WEEK_MS + 1)).toBeNull(); // ended, nothing made ahead
    expect(currentWeek([nextWeek], start)).toBeNull(); // future week isn't current yet
  });

  it("finds the week right after", () => {
    expect(nextWeekOf([thisWeek, nextWeek], thisWeek)?.id).toBe("b");
    expect(nextWeekOf([thisWeek], thisWeek)).toBeNull();
  });
});

describe("days in a week", () => {
  it("labels days and finds today", () => {
    expect(dayLabel(start, 0)).toBe("Sun 10/25");
    expect(dayLabel(start, 6)).toBe("Sat 10/31");
    expect(todayIndex(start, start + 3 * DAY_MS + 5)).toBe(3);
    expect(todayIndex(start, start - 1)).toBe(-1);
  });

  it("offers open days from today on (this week) or from day 0 (a future week)", () => {
    expect(openDays(start, start + 2 * DAY_MS, new Set([3]))).toEqual([2, 4, 5, 6]);
    expect(openDays(nextWeek.startDate, start + 2 * DAY_MS, new Set([0]))).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
