import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { checkAmount, ownWeek, requireUserId, weekForOffset } from "./model";

/** The receipts confirmed for this week (offset 0) or next week (offset 1), oldest first. */
export const forWeek = query({
  args: { offset: v.optional(v.number()) },
  handler: async (ctx, { offset }) => {
    const week = await weekForOffset(ctx, offset ?? 0);
    if (!week) return [];
    return await ctx.db
      .query("receipts")
      .withIndex("by_week", (q) => q.eq("weekId", week._id))
      .collect();
  },
});

const money = v.optional(v.number());

/**
 * "Done shopping": saves the receipt and links it to every paid row not already on a receipt,
 * so the tally counts the receipt's total (with tax and fees) instead of those rows' paid boxes.
 */
export const confirm = mutation({
  args: { offset: v.optional(v.number()), store: v.string(), subtotal: money, tax: money, fees: money, total: v.number(), fromPhoto: v.boolean() },
  handler: async (ctx, { offset, store, subtotal, tax, fees, total, fromPhoto }) => {
    const userId = await requireUserId(ctx);
    const week = await weekForOffset(ctx, offset ?? 0);
    if (!week) throw new Error("Set this week's budget first");
    const name = store.trim().slice(0, 60) || "Store";
    checkAmount(subtotal, "Subtotal");
    checkAmount(tax, "Tax");
    checkAmount(fees, "Fees");
    checkAmount(total, "Total");
    const receiptId = await ctx.db.insert("receipts", { userId, weekId: week._id, store: name, subtotal, tax, fees, total, at: Date.now(), fromPhoto });
    const rows = await ctx.db.query("listItems").withIndex("by_week", (q) => q.eq("weekId", week._id)).collect();
    let covered = 0;
    for (const r of rows) {
      if (r.paid === undefined || r.receiptId) continue;
      await ctx.db.patch(r._id, { receiptId });
      covered++;
    }
    return { receiptId, covered };
  },
});

/** Undoes a confirmed trip: the receipt goes away and its rows count their paid boxes again. */
export const remove = mutation({
  args: { id: v.id("receipts") },
  handler: async (ctx, { id }) => {
    const receipt = await ctx.db.get(id);
    if (!receipt) return;
    await ownWeek(ctx, receipt.weekId);
    const rows = await ctx.db.query("listItems").withIndex("by_week", (q) => q.eq("weekId", receipt.weekId)).collect();
    for (const r of rows) if (r.receiptId === id) await ctx.db.patch(r._id, { receiptId: undefined });
    await ctx.db.delete(id);
  },
});
