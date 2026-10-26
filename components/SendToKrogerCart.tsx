"use client";

import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";

// Sends unpaid items to the shopper's own Pick 'n Save / Metro Market cart (they sign in at Kroger once per device).
export default function SendToKrogerCart({ offset, storeName }: { offset: number; storeName?: string }) {
  const [state, setState] = useState<{ busy: boolean; note?: string; error?: boolean }>({ busy: false });
  const chain = storeName?.startsWith("Metro Market") ? "Metro Market" : "Pick 'n Save";
  const cartUrl = chain === "Metro Market" ? "https://www.metromarket.net/cart" : "https://www.picknsave.com/cart";

  // Back from Kroger's sign-in: say whether it worked (the next tap sends the list).
  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("kroger");
    if (result === "connected") setState({ busy: false, note: `Kroger account connected. Tap again to send your list.` });
    if (result === "failed") setState({ busy: false, error: true, note: "Connecting to Kroger didn't finish. Try again?" });
  }, []);

  async function send() {
    setState({ busy: true });
    const res = await fetch("/api/kroger/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offset }) }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { added?: number; packages?: number; needsConnect?: boolean; error?: string } | undefined;
    if (data?.needsConnect) {
      window.location.href = "/api/kroger/connect";
      return;
    }
    if (!data?.added) return setState({ busy: false, error: true, note: data?.error ?? "Couldn't reach Kroger. Try again?" });
    setState({ busy: false, note: `Added ${data.added} items (${data.packages} packages) to your ${chain} cart.` });
  }

  return (
    <div className="flex flex-col gap-1">
      <button type="button" onClick={send} disabled={state.busy} className="btn-crate">
        <ShoppingCart size={18} strokeWidth={2.75} aria-hidden /> {state.busy ? "Sending…" : `Send to my ${chain} cart`}
      </button>
      {state.note && (
        <p className={`text-sm font-bold ${state.error ? "text-tomato-dark" : "text-kale-ink"}`} role="status">
          {state.note}{" "}
          {!state.error && state.note.startsWith("Added") && (
            <a href={cartUrl} target="_blank" rel="noreferrer" className="font-extrabold underline">
              Open the cart
            </a>
          )}
        </p>
      )}
    </div>
  );
}
