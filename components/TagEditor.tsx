"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { X } from "lucide-react";

// A recipe's tags: Claude's picks plus any Tarik adds; × removes one.
export default function TagEditor({ id, tags }: { id: Id<"recipes">; tags: string[] }) {
  const setTags = useMutation(api.recipes.setTags);
  const [draft, setDraft] = useState("");
  const save = (next: string[]) => setTags({ updates: [{ id, tags: next }] });

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Tags">
      {tags.map((t) => (
        <span key={t} className="flex items-center gap-0.5 rounded-full border-2 border-line bg-white py-0.5 pl-3 pr-0.5 text-sm font-extrabold">
          {t}
          <button
            type="button"
            onClick={() => save(tags.filter((x) => x !== t))}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink-soft hover:bg-line"
            aria-label={`Remove tag ${t}`}
          >
            <X size={13} strokeWidth={3} aria-hidden />
          </button>
        </span>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const t = draft.trim().toLowerCase();
          if (t && !tags.includes(t) && tags.length < 12) save([...tags, t]);
          setDraft("");
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={24}
          placeholder="+ add tag"
          aria-label="Add a tag"
          className="w-28 rounded-full border-2 border-dashed border-line bg-transparent px-3 py-1 text-sm font-bold placeholder:text-ink-soft"
        />
      </form>
    </div>
  );
}
