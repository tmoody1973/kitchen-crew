"use client";

import { useState } from "react";
import { ShoppingCart } from "lucide-react";

// Opens Instacart with the list (or a recipe) filled in; Tarik picks a store there and checks out.
export default function SendToInstacart({ body, label = "Send to Instacart" }: { body: { offset: number } | { recipeId: string; servings: number }; label?: string }) {
  const [state, setState] = useState<{ busy: boolean; error?: string }>({ busy: false });
  async function send() {
    // Open the tab now, while the tap still counts as the user's: phones block tabs opened after a wait.
    const tab = window.open("", "_blank");
    setState({ busy: true });
    try {
      const res = await fetch("/api/instacart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!data.url) throw new Error(data.error ?? "Couldn't reach Instacart. Try again?");
      if (tab) {
        tab.opener = null; // the Instacart page can't reach back into Mise
        tab.location.href = data.url;
      }
      else window.location.href = data.url;
      setState({ busy: false });
    } catch (err) {
      tab?.close();
      setState({ busy: false, error: err instanceof Error ? err.message : "Couldn't reach Instacart. Try again?" });
    }
  }
  return (
    <div className="flex flex-col items-start gap-1">
      <button type="button" onClick={send} disabled={state.busy} className="btn-crate">
        <ShoppingCart size={17} strokeWidth={2.75} aria-hidden /> {state.busy ? "Opening Instacart…" : label}
      </button>
      {state.error && <p role="alert" className="text-sm font-bold text-tomato-dark">{state.error}</p>}
    </div>
  );
}
