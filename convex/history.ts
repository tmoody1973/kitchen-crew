import { query } from "./_generated/server";
import { requireUserId, userWeeks } from "./model";
import { actualPaid, estimateTotal } from "../lib/tally";

const sum = (ns: number[]) => Math.round(ns.reduce((s, n) => s + n * 100, 0)) / 100;

/** Every week that has started, with its budget, planned (Kroger estimates), shelf (paid boxes) and actual (receipts) totals. */
export const weeks = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const now = Date.now();
    const started = (await userWeeks(ctx, userId)).filter((w) => w.startDate <= now);
    return await Promise.all(
      started.map(async (w) => {
        const [items, receipts] = await Promise.all([
          ctx.db.query("listItems").withIndex("by_week", (q) => q.eq("weekId", w._id)).collect(),
          ctx.db.query("receipts").withIndex("by_week", (q) => q.eq("weekId", w._id)).collect(),
        ]);
        return {
          weekId: w._id as string,
          startDate: w.startDate,
          budget: w.budget,
          sample: w.sample,
          planned: sum(items.map((i) => estimateTotal(i.estimate, i.packs ?? 1) ?? 0)),
          shelf: sum(items.map((i) => i.paid ?? 0)),
          actual: sum(actualPaid(items, receipts)),
          receipts: receipts.length,
        };
      }),
    );
  },
});
