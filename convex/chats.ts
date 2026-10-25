import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./model";

const MAX_JSON = 900_000; // Convex documents max out at 1 MB

/** Your recent chats, newest first (titles only). */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const chats = await ctx.db
      .query("chats")
      .withIndex("by_user_updated", (q) => q.eq("userId", userId))
      .order("desc")
      .take(20);
    return chats.map((c) => ({ _id: c._id, title: c.title, updatedAt: c.updatedAt }));
  },
});

/** One chat with its messages, or null if it isn't yours. */
export const get = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const chatId = ctx.db.normalizeId("chats", id);
    const chat = chatId ? await ctx.db.get(chatId) : null;
    return chat && chat.userId === userId ? chat : null;
  },
});

/** Creates or updates a chat; returns its id. */
export const save = mutation({
  args: { id: v.optional(v.string()), title: v.string(), messagesJson: v.string(), removedJson: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    if (args.messagesJson.length > MAX_JSON) throw new Error("This chat is too long to save; start a new one.");
    if (args.removedJson.length > 20_000) throw new Error("Too much plan state");
    const fields = {
      title: args.title.trim().slice(0, 80) || "New chat",
      messagesJson: args.messagesJson,
      removedJson: args.removedJson,
      updatedAt: Date.now(),
    };
    const chatId = args.id ? ctx.db.normalizeId("chats", args.id) : null;
    if (chatId) {
      const chat = await ctx.db.get(chatId);
      if (!chat || chat.userId !== userId) throw new Error("Chat not found");
      await ctx.db.patch(chatId, fields);
      return chatId;
    }
    return await ctx.db.insert("chats", { userId, ...fields });
  },
});

export const remove = mutation({
  args: { id: v.id("chats") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const chat = await ctx.db.get(id);
    if (!chat || chat.userId !== userId) throw new Error("Chat not found");
    await ctx.db.delete(id);
  },
});
