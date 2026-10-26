"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ArrowRight, Camera, Minus, Package, Plus, X } from "lucide-react";
import { COMMON_BOX_ITEMS } from "@/lib/pantry-box";
import { shrink } from "@/lib/photo";

type Item = { name: string; qty: number };

// "Add my food box": snap the box or tick what's in it, check the list, save to the pantry, then plan around it.
export default function FoodBox({ boxCount }: { boxCount: number }) {
  const addBox = useMutation(api.pantry.addBox);
  const clearBox = useMutation(api.pantry.clearBox);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [extra, setExtra] = useState("");
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const has = (name: string) => items.some((i) => i.name === name);
  const toggle = (name: string) => setItems((list) => (has(name) ? list.filter((i) => i.name !== name) : [...list, { name, qty: 1 }]));
  const bump = (name: string, d: number) => setItems((list) => list.map((i) => (i.name === name ? { ...i, qty: Math.max(1, Math.min(99, i.qty + d)) } : i)));

  async function readPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setReading(true);
    try {
      const image = await shrink(file);
      const res = await fetch("/api/pantry/photo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image }) });
      const data = (await res.json().catch(() => ({}))) as { items?: Item[]; error?: string };
      if (!data.items) throw new Error(data.error ?? "Couldn't read that photo.");
      // Merge with anything already ticked.
      setItems((list) =>
        data.items!.reduce(
          (acc, it) => (acc.some((a) => a.name === it.name) ? acc.map((a) => (a.name === it.name ? { ...a, qty: Math.min(99, a.qty + it.qty) } : a)) : [...acc, it]),
          list,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read that photo.");
    } finally {
      setReading(false);
    }
  }

  function addExtra(e: FormEvent) {
    e.preventDefault();
    const n = extra.trim().toLowerCase();
    if (n && !has(n)) setItems((list) => [...list, { name: n.slice(0, 60), qty: 1 }]);
    setExtra("");
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await addBox({ items });
      setItems([]);
      setOpen(false);
    } catch {
      setError("Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <section className="crate flex flex-col gap-3 p-4" aria-label="Food box">
        {boxCount > 0 ? (
          <>
            <p className="flex items-center gap-2 font-black">
              <Package size={20} strokeWidth={2.75} className="text-tomato" aria-hidden /> {boxCount} items from your food box
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/plan?ask=box" className="btn-press">
                Plan the week around my box <ArrowRight size={18} strokeWidth={3} aria-hidden />
              </Link>
              <button type="button" onClick={() => setOpen(true)} className="btn-crate">Add another box</button>
              <button type="button" onClick={() => clearBox().catch(() => {})} className="px-1 text-sm font-extrabold underline">Box used up</button>
            </div>
          </>
        ) : (
          <>
            <p className="flex items-center gap-2 font-black">
              <Package size={20} strokeWidth={2.75} className="text-tomato" aria-hidden /> Got a box from a food pantry?
            </p>
            <p className="-mt-2 text-sm font-bold text-ink-soft">Add what&apos;s in it and the crew plans dinners around it, buying only what&apos;s missing.</p>
            <button type="button" onClick={() => setOpen(true)} className="btn-press self-start">Add my food box</button>
          </>
        )}
      </section>
    );
  }

  return (
    <section className="crate flex flex-col gap-3 p-4" aria-label="Add my food box">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-black"><Package size={20} strokeWidth={2.75} className="text-tomato" aria-hidden /> What&apos;s in the box?</p>
        <button type="button" onClick={() => { setOpen(false); setItems([]); setError(null); }} className="text-sm font-extrabold underline">Cancel</button>
      </div>

      <label className={`btn-crate cursor-pointer self-start ${reading ? "opacity-60" : ""}`}>
        <Camera size={18} strokeWidth={2.75} aria-hidden /> {reading ? "Reading the photo…" : "Snap the box"}
        <input type="file" accept="image/*" capture="environment" onChange={readPhoto} disabled={reading} className="sr-only" aria-label="Take a photo of the food box" />
      </label>

      <p className="text-sm font-bold text-ink-soft">Or tick what came in it:</p>
      <div className="flex flex-wrap gap-1.5">
        {COMMON_BOX_ITEMS.map((n) => (
          <button key={n} type="button" onClick={() => toggle(n)} aria-pressed={has(n)} className={`rounded-full border-2 px-2.5 py-1 text-sm font-bold ${has(n) ? "border-ink bg-tag" : "border-line bg-white"}`}>
            {n}
          </button>
        ))}
      </div>
      <form onSubmit={addExtra} className="flex gap-2">
        <input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Something else, like canned yams" maxLength={60} aria-label="Add another item" className="field min-w-0 flex-1 px-3 py-2 text-base" />
        <button type="submit" disabled={!extra.trim()} className="btn-crate shrink-0">Add</button>
      </form>

      {items.length > 0 && (
        <>
          <p className="font-black">In your box ({items.reduce((s, i) => s + i.qty, 0)} items)</p>
          <ul className="flex flex-col">
            {items.map((i) => (
              <li key={i.name} className="row-rule flex items-center gap-2 py-2">
                <span className="flex-1 font-bold capitalize">{i.name}</span>
                <button type="button" onClick={() => bump(i.name, -1)} disabled={i.qty <= 1} className="btn-round h-8 w-8" aria-label={`One fewer ${i.name}`}><Minus size={14} strokeWidth={3} aria-hidden /></button>
                <span className="font-sign w-6 text-center">{i.qty}</span>
                <button type="button" onClick={() => bump(i.name, 1)} className="btn-round h-8 w-8" aria-label={`One more ${i.name}`}><Plus size={14} strokeWidth={3} aria-hidden /></button>
                <button type="button" onClick={() => toggle(i.name)} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-line" aria-label={`Remove ${i.name}`}><X size={14} strokeWidth={3} aria-hidden /></button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={save} disabled={saving} className="btn-press self-start">{saving ? "Saving…" : "Save to my pantry"}</button>
        </>
      )}
      {error && <p className="text-sm font-bold text-tomato-dark" role="alert">{error}</p>}
    </section>
  );
}
