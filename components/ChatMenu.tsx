"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function ago(ms: number): string {
  const min = Math.round((Date.now() - ms) / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

// "Chats" list and "+ New chat", like Claude's sidebar but folded into one row.
export default function ChatMenu({ currentId }: { currentId?: string }) {
  const chats = useQuery(api.chats.list) ?? [];
  const remove = useMutation(api.chats.remove);
  const [open, setOpen] = useState(false);

  // Full page loads so the chat view starts clean with the chosen conversation.
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex-1 rounded-2xl bg-white px-4 py-2 text-left font-bold text-slate-600"
        >
          💬 Chats ({chats.length}) {open ? "▴" : "▾"}
        </button>
        <a href="/plan?new=1" className="rounded-2xl border-b-4 border-leaf-dark bg-leaf px-4 py-2 font-black text-white">
          + New chat
        </a>
      </div>
      {open && (
        <ul className="flex flex-col gap-1 rounded-2xl bg-white p-2">
          {chats.length === 0 && <li className="p-2 text-sm font-bold text-slate-500">No saved chats yet.</li>}
          {chats.map((c) => (
            <li key={c._id} className={`flex items-center gap-2 rounded-xl p-2 ${c._id === currentId ? "bg-leaf/10" : ""}`}>
              <a href={`/plan?chat=${c._id}`} className="min-w-0 flex-1">
                <p className="truncate font-bold">{c.title}</p>
                <p className="text-xs text-slate-500">{ago(c.updatedAt)}</p>
              </a>
              <button
                type="button"
                onClick={() => remove({ id: c._id })}
                className="rounded-full px-2 py-1 text-slate-400 hover:bg-slate-100"
                aria-label={`Delete chat: ${c.title}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
