// Which 7-day budget week a moment falls in, and the days inside a week. Plain code, tested.

export const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEK_MS = 7 * DAY_MS;

type WeekLike = { startDate: number };

/** The week whose 7 days include `now` (a week made ahead of time becomes current on its first day). */
export function currentWeek<T extends WeekLike>(weeks: readonly T[], now: number): T | null {
  return weeks.find((w) => w.startDate <= now && now < w.startDate + WEEK_MS) ?? null;
}

/** The week that starts right after `week`. */
export function nextWeekOf<T extends WeekLike>(weeks: readonly T[], week: WeekLike): T | null {
  return weeks.find((w) => w.startDate === week.startDate + WEEK_MS) ?? null;
}

/** "Sun 10/25" for day `index` (0–6) of a week. */
export function dayLabel(startDate: number, index: number): string {
  const d = new Date(startDate + index * DAY_MS);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" }).replace(",", "");
}

/** Index of today inside the week (0–6), or -1 outside it. */
export function todayIndex(startDate: number, now: number): number {
  const i = Math.floor((now - startDate) / DAY_MS);
  return i >= 0 && i < 7 ? i : -1;
}

/** Open days for new dinners: from today (or day 0 for a future week) onward, skipping days that already have one. */
export function openDays(startDate: number, now: number, taken: ReadonlySet<number>): number[] {
  const from = Math.max(0, todayIndex(startDate, now));
  return [0, 1, 2, 3, 4, 5, 6].filter((i) => i >= (startDate > now ? 0 : from) && !taken.has(i));
}
