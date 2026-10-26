"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { ScanBarcode, X } from "lucide-react";
import { readBarcode } from "@/lib/barcode";
import type { Product } from "@/lib/kroger";
import { estimateTotal, formatMoney } from "@/lib/tally";

type Result =
  | { kind: "added" | "onList" | "swapped"; product: Product }
  | { kind: "sticker"; cents: number }
  | { kind: "paid"; amount: number }
  | { kind: "error"; message: string };

const FORMATS = ["upc_a", "upc_e", "ean_13", "ean_8"];

// Scan in the aisle: a packaged item joins the list with its Kroger price; a store sticker fills in what you paid.
export default function BarcodeScanner({ items, storeId, offset }: { items: Doc<"listItems">[]; storeId?: string; offset: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-crate self-start">
        <ScanBarcode size={18} strokeWidth={2.75} aria-hidden /> Scan
      </button>
      {open && createPortal(<ScanSheet items={items} storeId={storeId} offset={offset} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

/**
 * forItem: scanning from one list row. A sticker pays that row; the same product offers "Mark paid";
 * a different product swaps the row to it (no duplicate row).
 */
export function ScanSheet({
  items,
  storeId,
  offset,
  forItem,
  onClose,
}: {
  items: Doc<"listItems">[];
  storeId?: string;
  offset: number;
  forItem?: Doc<"listItems">;
  onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState("");
  const add = useMutation(api.listItems.add);
  const setPaid = useMutation(api.listItems.setPaid);
  const setProduct = useMutation(api.listItems.setProduct);
  // The row a scanned product belongs to: the row you scanned from, else an unpaid row with that product.
  const rowFor = (product: Product) => forItem ?? items.find((i) => i.productId === product.productId && i.paid === undefined);

  async function markPaid(item: Doc<"listItems">, amount: number) {
    await setPaid({ id: item._id, paid: amount });
    setResult({ kind: "paid", amount });
  }

  async function handle(code: string) {
    const scan = readBarcode(code);
    if (!scan) return setResult({ kind: "error", message: "That barcode didn't read cleanly. Try again or type the numbers." });
    if (scan.kind === "sticker") {
      if (forItem) return markPaid(forItem, scan.cents / 100).catch(() => setResult({ kind: "error", message: "Couldn't save. Try again." }));
      return setResult({ kind: "sticker", cents: scan.cents });
    }
    if (!storeId) return setResult({ kind: "error", message: "Pick a Kroger store on the List first, so I can look up prices." });
    setBusy(true);
    try {
      const res = await fetch("/api/barcode", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, storeId }) });
      const data = (await res.json().catch(() => ({}))) as { product?: Product; error?: string };
      if (!data.product) return setResult({ kind: "error", message: data.error ?? "Couldn't look that up." });
      const product = data.product;
      if (forItem && forItem.productId !== product.productId) {
        await setProduct({ id: forItem._id, product });
        return setResult({ kind: "swapped", product });
      }
      if (forItem || items.some((i) => i.productId === product.productId)) return setResult({ kind: "onList", product });
      await add({ name: product.name.slice(0, 80), product, offset });
      setResult({ kind: "added", product });
    } catch {
      setResult({ kind: "error", message: "No connection. Try again?" });
    } finally {
      setBusy(false);
    }
  }

  // Camera + detector run only while there's nothing on screen to read.
  useEffect(() => {
    if (result || busy) return;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let stopped = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (stopped || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        // ZXing in WebAssembly: works on iPhone Safari, which has no built-in barcode reader. Loaded only when scanning.
        const { BarcodeDetector } = await import("barcode-detector/ponyfill");
        const detector = new BarcodeDetector({ formats: FORMATS as never });
        timer = setInterval(async () => {
          if (!video.current || video.current.readyState < 2) return;
          const [hit] = await detector.detect(video.current).catch(() => []);
          if (!hit || stopped) return;
          stopped = true;
          clearInterval(timer);
          navigator.vibrate?.(60);
          handle(hit.rawValue);
        }, 300);
      } catch {
        setCameraError("The camera isn't available here. Type the numbers under the barcode instead.");
      }
    })();
    return () => {
      stopped = true;
      clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // handle reads fresh props each render; restarting the camera on every prop change isn't wanted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, busy]);

  function submitTyped(e: FormEvent) {
    e.preventDefault();
    if (typed.trim()) handle(typed);
    setTyped("");
  }

  const unpaid = items.filter((i) => i.paid === undefined);
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate text-chalk" role="dialog" aria-modal="true" aria-label="Scan a barcode">
      <div className="flex items-center justify-between p-4">
        <p className="font-sign text-xl">Scan a barcode</p>
        <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full bg-chalk/10" aria-label="Close scanner">
          <X size={20} strokeWidth={3} aria-hidden />
        </button>
      </div>

      {!result && !cameraError && (
        <div className="relative mx-4 overflow-hidden rounded-2xl bg-ink">
          <video ref={video} playsInline muted className="aspect-[3/4] w-full object-cover" />
          <div aria-hidden className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-xl border-4 border-tag/90" />
          <p className="absolute inset-x-0 bottom-3 text-center" role="status">
            <span className="rounded-full bg-ink/80 px-3 py-1.5 text-sm font-extrabold">{busy ? "Looking it up…" : "Line the barcode up in the box"}</span>
          </p>
        </div>
      )}
      {cameraError && !result && <p className="mx-4 font-bold text-chalk-dim">{cameraError}</p>}

      {result && (
        <div className="mx-4 flex flex-col gap-3 rounded-2xl bg-chalk p-4 text-ink" role="status">
          {result.kind === "error" && <p className="font-bold text-tomato-dark">{result.message}</p>}
          {result.kind === "paid" && (
            <p className="font-black">
              Paid {formatMoney(result.amount)}
              {forItem ? ` for ${forItem.name}` : ""}.
            </p>
          )}
          {(result.kind === "added" || result.kind === "onList" || result.kind === "swapped") && (
            <div className="flex items-center gap-3">
              {result.product.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- Kroger product photo
                <img src={result.product.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl object-contain" />
              )}
              <div className="min-w-0">
                <p className="font-black leading-snug">{result.product.name}</p>
                <p className="text-sm font-bold text-ink-soft">
                  {result.product.size ? `${result.product.size} · ` : ""}
                  {formatMoney(result.product.price)} ·{" "}
                  {result.kind === "added" ? "added to your list" : result.kind === "swapped" ? `now on your list for ${forItem?.name}` : "on your list"}
                </p>
              </div>
            </div>
          )}
          {(result.kind === "onList" || result.kind === "swapped") &&
            (() => {
              const row = rowFor(result.product);
              const amount = row && row.paid === undefined ? estimateTotal(result.product.price, row.packs ?? 1) : undefined;
              return amount === undefined ? null : (
                <button type="button" onClick={() => markPaid(row!, amount).catch(() => setResult({ kind: "error", message: "Couldn't save. Try again." }))} className="btn-press self-start">
                  Mark paid {formatMoney(amount)}
                </button>
              );
            })()}
          {result.kind === "sticker" && (
            <>
              <p className="font-black">Sticker price {formatMoney(result.cents / 100)}. Which item is it?</p>
              {unpaid.length === 0 ? (
                <p className="font-bold text-ink-soft">Everything on your list already has a paid amount.</p>
              ) : (
                <ul className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
                  {unpaid.map((i) => (
                    <li key={i._id}>
                      <button
                        type="button"
                        onClick={async () => {
                          await setPaid({ id: i._id, paid: result.cents / 100 });
                          onClose();
                        }}
                        className="w-full rounded-xl border-2 border-line bg-white px-3 py-2.5 text-left font-extrabold"
                      >
                        {i.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {forItem && result.kind !== "error" ? (
            <button type="button" onClick={onClose} className="btn-crate self-start">Done</button>
          ) : (
            <button type="button" onClick={() => setResult(null)} className="btn-crate self-start">Scan another</button>
          )}
        </div>
      )}

      <form onSubmit={submitTyped} className="mx-4 mt-auto flex gap-2 pb-6 pt-4">
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          inputMode="numeric"
          placeholder="Or type the numbers"
          aria-label="Barcode numbers"
          className="field min-w-0 flex-1 text-ink"
        />
        <button type="submit" className="btn-press shrink-0">Look up</button>
      </form>
    </div>
  );
}
