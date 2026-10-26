"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { ArrowRight, Camera, ReceiptText, Undo2 } from "lucide-react";
import { actualPaid, estimateTotal, formatMoney } from "@/lib/tally";

type Fields = { store: string; subtotal: string; tax: string; fees: string; total: string };

const cents = (n: number) => Math.round(n * 100);
const sum = (ns: number[]) => ns.reduce((s, n) => s + cents(n), 0) / 100;

/** Shrinks a phone photo to ≤1600 px JPEG so it uploads fast and stays under the server's size limit. */
async function shrink(file: File): Promise<string> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

const money = (text: string): number | undefined | "invalid" => {
  if (!text.trim()) return undefined;
  const n = Number(text.replace("$", ""));
  return Number.isFinite(n) && n >= 0 ? n : "invalid";
};

// "Done shopping": snap the receipt (Claude reads the totals, you confirm), then the week shows planned vs actual.
export default function DoneShopping({ week, items }: { week: Doc<"weeks">; items: Doc<"listItems">[] }) {
  const receipts = useQuery(api.receipts.forWeek, {});
  const confirm = useMutation(api.receipts.confirm);
  const undo = useMutation(api.receipts.remove);
  const [fields, setFields] = useState<Fields | null>(null);
  const [fromPhoto, setFromPhoto] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (receipts === undefined) return null;

  const uncovered = items.filter((i) => i.paid !== undefined && !i.receiptId);
  const shelfUncovered = sum(uncovered.map((i) => i.paid!));
  const planned = sum(items.map((i) => estimateTotal(i.estimate, i.packs ?? 1) ?? 0));
  const shelf = sum(items.map((i) => i.paid ?? 0));
  const actual = sum(actualPaid(items, receipts));
  const store = (week.otherStore ?? week.storeName?.split(" · ")[0] ?? "").slice(0, 60);
  const blank = (): Fields => ({ store, subtotal: "", tax: "", fees: "", total: "" });

  async function readPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setReading(true);
    try {
      const image = await shrink(file);
      const res = await fetch("/api/receipt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image }) });
      const data = (await res.json().catch(() => ({}))) as { receipt?: Record<string, number | string | null>; error?: string };
      if (!data.receipt) throw new Error(data.error ?? "Couldn't read that receipt. Type the total instead.");
      const r = data.receipt;
      const txt = (n: unknown) => (typeof n === "number" ? n.toFixed(2) : "");
      setFields({ store: String(r.store || store), subtotal: txt(r.subtotal), tax: txt(r.tax), fees: txt(r.fees), total: txt(r.total) });
      setFromPhoto(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read that receipt.");
      setFields(blank());
      setFromPhoto(false);
    } finally {
      setReading(false);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!fields) return;
    const [subtotal, tax, fees, total] = [fields.subtotal, fields.tax, fields.fees, fields.total].map(money);
    if ([subtotal, tax, fees, total].includes("invalid")) return setError("Type amounts like 4.29");
    if (total === undefined) return setError("Type the receipt's total");
    setError(null);
    try {
      await confirm({ store: fields.store, subtotal: subtotal as number | undefined, tax: tax as number | undefined, fees: fees as number | undefined, total: total as number, fromPhoto });
      setFields(null);
    } catch {
      setError("Couldn't save. Try again.");
    }
  }

  const set = (k: keyof Fields) => (e: ChangeEvent<HTMLInputElement>) => setFields((f) => (f ? { ...f, [k]: e.target.value } : f));
  // Compare like with like: the receipts against the planned cost of the rows they cover.
  const coveredRows = items.filter((i) => i.receiptId);
  const plannedCovered = sum(coveredRows.map((i) => estimateTotal(i.estimate, i.packs ?? 1) ?? 0));
  const receiptTotal = sum(receipts.map((r) => r.total));
  const diff = receiptTotal - plannedCovered;

  return (
    <section className="crate flex flex-col gap-3 p-4" aria-label="Done shopping">
      <h2 className="flex items-center gap-2 font-black">
        <ReceiptText size={18} strokeWidth={2.75} aria-hidden /> Planned vs actual
      </h2>
      <dl className="grid grid-cols-3 gap-2 text-center">
        {[
          ["Planned", planned, "whole list"],
          ["Shelf", shelf, "paid boxes"],
          ["Actual", actual, receipts.length ? "with receipts" : "no receipt yet"],
        ].map(([label, n, note]) => (
          <div key={label as string} className="rounded-xl border-2 border-line bg-white px-1 py-2">
            <dt className="text-xs font-extrabold text-ink-soft">{label}</dt>
            <dd className="font-sign text-lg leading-tight">{formatMoney(n as number)}</dd>
            <dd className="text-[0.7rem] font-bold text-ink-soft">{note}</dd>
          </div>
        ))}
      </dl>
      {receipts.length > 0 && plannedCovered > 0 && (
        <p className={`text-sm font-extrabold ${diff <= 0 ? "text-kale-ink" : "text-squash-ink"}`}>
          {diff <= 0 ? `Nice! ${formatMoney(-diff)} under` : `${formatMoney(diff)} over`} the {formatMoney(plannedCovered)} planned for the {coveredRows.length}{" "}
          {coveredRows.length === 1 ? "item" : "items"} on your receipts (tax, fees, and register prices included).
        </p>
      )}

      {receipts.length > 0 && (
        <ul className="flex flex-col gap-1.5 text-sm">
          {receipts.map((r) => (
            <li key={r._id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="font-black">{r.store}</span>
              <span className="tag text-sm">{formatMoney(r.total)}</span>
              <span className="text-xs font-bold text-ink-soft">
                {[r.tax ? `tax ${formatMoney(r.tax)}` : "", r.fees ? `fees ${formatMoney(r.fees)}` : "", r.fromPhoto ? "from photo" : "typed"].filter(Boolean).join(" · ")}
              </span>
              <button type="button" onClick={() => undo({ id: r._id }).catch(() => setError("Couldn't undo. Try again."))} className="ml-auto flex items-center gap-1 text-xs font-extrabold underline" aria-label={`Undo the ${r.store} receipt`}>
                <Undo2 size={13} strokeWidth={2.75} aria-hidden /> Undo
              </button>
            </li>
          ))}
        </ul>
      )}

      {!fields && (
        <div className="flex flex-wrap items-center gap-2">
          <label className={`btn-press cursor-pointer ${reading ? "opacity-60" : ""}`}>
            <Camera size={18} strokeWidth={2.75} aria-hidden /> {reading ? "Reading the receipt…" : "Done shopping"}
            <input type="file" accept="image/*" capture="environment" onChange={readPhoto} disabled={reading} className="sr-only" aria-label="Done shopping: take a photo of the receipt" />
          </label>
          <button type="button" onClick={() => { setFields(blank()); setFromPhoto(false); }} className="px-1 text-sm font-extrabold underline">
            Type the total instead
          </button>
        </div>
      )}
      {!fields && uncovered.length > 0 && (
        <p className="-mt-1 text-xs font-bold text-ink-soft">
          The receipt will cover {uncovered.length} paid {uncovered.length === 1 ? "item" : "items"} ({formatMoney(shelfUncovered)} in paid boxes).
        </p>
      )}

      {fields && (
        <form onSubmit={save} className="flex flex-col gap-2">
          <p className="text-sm font-bold text-ink-soft">{fromPhoto ? "Check what the crew read, fix anything off, then confirm." : "Type what the receipt says."}</p>
          <label className="flex items-center justify-between gap-2 text-sm font-extrabold">
            Store
            <input value={fields.store} onChange={set("store")} maxLength={60} className="field w-44 px-2 py-1.5 text-base" />
          </label>
          {(["subtotal", "tax", "fees", "total"] as const).map((k) => (
            <label key={k} className={`flex items-center justify-between gap-2 text-sm ${k === "total" ? "font-black" : "font-extrabold"}`}>
              {k === "fees" ? "Fees (delivery, bags, tip)" : k[0].toUpperCase() + k.slice(1)}
              <input value={fields[k]} onChange={set(k)} inputMode="decimal" placeholder={k === "total" ? "required" : "—"} className="field w-28 px-2 py-1.5 text-right text-base" />
            </label>
          ))}
          <p className="text-xs font-bold text-ink-soft">
            Paid boxes on {uncovered.length} {uncovered.length === 1 ? "item" : "items"}: {formatMoney(shelfUncovered)}. The tally will count the receipt total instead.
          </p>
          <div className="flex gap-2">
            <button type="submit" className="btn-press">Confirm trip</button>
            <button type="button" onClick={() => { setFields(null); setError(null); }} className="btn-crate">Cancel</button>
          </div>
        </form>
      )}
      {error && <p className="text-sm font-bold text-tomato-dark" role="alert">{error}</p>}
      <Link href="/history" className="flex items-center gap-1 self-start text-sm font-extrabold underline">
        Spending history <ArrowRight size={14} strokeWidth={3} aria-hidden />
      </Link>
    </section>
  );
}
