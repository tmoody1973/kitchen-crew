"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ChevronDown, MessagesSquare, Plus, X } from "lucide-react";

function ago(ms: number): string {
  const min = Math.round((Date.now() - ms) / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

// "Chats" list and "New chat", like Claude's sidebar folded into one row.
export default function ChatMenu({ currentId }: { currentId?: string }) {
  const chats = useQuery(api.chats.list) ?? [];
  const remove = useMutation(api.chats.remove);
  const [open, setOpen] = useState(false);

  // Full page loads so the chat view starts clean with the chosen conversation.
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="btn-crate flex-1 justify-start">
          <MessagesSquare size={18} strokeWidth={2.5} aria-hidden /> Chats ({chats.length})
          <ChevronDown size={16} strokeWidth={3} className={`ml-auto ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>
        <a href="/plan?new=1" className="btn-crate">
          <Plus size={18} strokeWidth={3} aria-hidden /> New
        </a>
      </div>
      {open && (
        <ul className="crate flex flex-col gap-1 p-2">
          {chats.length === 0 && <li className="p-2 text-sm font-bold text-ink-soft">No saved chats yet.</li>}
          {chats.map((c) => (
            <li key={c._id} className={`flex items-center gap-2 rounded-xl p-2 ${c._id === currentId ? "bg-tag/40" : "hover:bg-ground"}`}>
              <a href={`/plan?chat=${c._id}`} className="min-w-0 flex-1" aria-current={c._id === currentId ? "true" : undefined}>
                <p className="truncate font-bold">{c.title}</p>
                <p className="text-xs font-bold text-ink-soft">{ago(c.updatedAt)}</p>
              </a>
              <button
                type="button"
                onClick={() => remove({ id: c._id })}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-line"
                aria-label={`Delete chat: ${c.title}`}
              >
                <X size={16} strokeWidth={3} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
