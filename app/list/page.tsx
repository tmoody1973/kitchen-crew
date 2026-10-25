"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import TallyHeader from "@/components/TallyHeader";
import ListRow from "@/components/ListRow";
import { isWeekActive } from "@/lib/tally";
import { fetchPrices } from "@/lib/kroger-client";

type Store = { id: string; name: string };
const ADD_STORE = "__add";

export default function ListPage() {
  const week = useQuery(api.weeks.latest);
  const items = useQuery(api.listItems.mine);
  if (week === undefined || items === undefined) return null;

  if (week === null || !isWeekActive(week.startDate, Date.now())) {
    return <TallyHeader />;
  }

  return (
    <div className="flex flex-col gap-4">
      <TallyHeader />
      <StorePicker week={week} items={items} />
      <AddItem krogerStoreId={week.storeId} />
      <AddRegulars krogerStoreId={week.storeId} />
      {items.length === 0 ? (
        <p className="rounded-2xl bg-white p-4 text-center font-bold text-slate-500">
          Your list is empty. Add an item above, or{" "}
          <Link href="/plan" className="text-leaf-dark underline">
            plan meals with the crew
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <ListRow key={item._id} item={item} krogerStoreId={week.storeId} />
          ))}
        </ul>
      )}
    </div>
  );
}

function StorePicker({ week, items }: { week: Doc<"weeks">; items: Doc<"listItems">[] }) {
  const setStore = useMutation(api.weeks.setStore);
  const setOtherStore = useMutation(api.weeks.setOtherStore);
  const applyPrices = useMutation(api.listItems.applyPrices);
  const otherStores = useQuery(api.weeks.otherStores) ?? [];
  const [stores, setStores] = useState<Store[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stores")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((body: { stores: Store[] }) => setStores(body.stores))
      .catch(() => setStatus("Couldn't load Kroger stores. Reload to try again."));
  }, []);

  async function chooseKroger(store: Store) {
    const changed = store.id !== week.storeId;
    await setStore({ storeId: store.id, storeName: store.name });
    if (!changed) return;

    // Re-price Kroger rows (same product) and "no price found" rows; keep estimates you typed.
    const toReprice = items.filter((i) => i.estimateSource === "kroger" || i.estimate === undefined);
    if (toReprice.length === 0) return;
    setStatus(`Re-pricing ${toReprice.length} items at ${store.name}…`);
    const results = await fetchPrices(
      toReprice.map((i) => ({ name: i.name, productId: i.productId })),
      store.id,
    );
    await applyPrices({ prices: toReprice.map((i, n) => ({ id: i._id, product: results[n] ?? undefined })) });
    setStatus(null);
  }

  async function chooseOther(name: string) {
    setAdding(false);
    setNewName("");
    await setOtherStore({ name }).catch(() => setStatus("Couldn't save that store."));
  }

  function onSelect(value: string) {
    if (value === ADD_STORE) return setAdding(true);
    const [kind, ...rest] = value.split(":");
    const id = rest.join(":");
    if (kind === "kroger") {
      const store = stores?.find((s) => s.id === id);
      if (store) chooseKroger(store);
    } else {
      chooseOther(id);
    }
  }

  const value = week.otherStore ? `other:${week.otherStore}` : week.storeId ? `kroger:${week.storeId}` : "";

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-white p-4 font-bold">
      <label className="flex flex-col gap-1">
        Shopping at
        <select
          value={adding ? ADD_STORE : value}
          onChange={(e) => onSelect(e.target.value)}
          className="rounded-xl border-2 border-slate-200 bg-white px-3 py-3 text-lg font-black"
        >
          <option value="" disabled>
            {stores ? "Pick your store" : "Loading stores…"}
          </option>
          <optgroup label="Pick 'n Save & Metro Market (Kroger prices)">
            {stores?.map((s) => (
              <option key={s.id} value={`kroger:${s.id}`}>
                {s.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Other stores (compared to Kroger)">
            {otherStores.map((s) => (
              <option key={s._id} value={`other:${s.name}`}>
                {s.name}
              </option>
            ))}
            <option value={ADD_STORE}>+ Add another store…</option>
          </optgroup>
        </select>
      </label>

      {adding && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newName.trim()) chooseOther(newName);
          }}
          className="flex gap-2"
        >
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Sendik's, Whole Foods…"
            maxLength={60}
            className="min-w-0 flex-1 rounded-xl border-2 border-slate-200 px-3 py-2"
          />
          <button className="rounded-xl bg-leaf px-4 font-black text-white">Add</button>
          <button type="button" onClick={() => setAdding(false)} className="px-2 text-slate-500">
            Cancel
          </button>
        </form>
      )}

      {week.otherStore && (
        <p className="text-sm text-slate-500">
          {week.storeName
            ? `Type what you pay at ${week.otherStore}; each row compares it to Kroger prices at ${week.storeName}.`
            : `Pick a Pick 'n Save or Metro Market once to get Kroger prices to compare against.`}
        </p>
      )}
      {status && <p className="text-sm text-slate-500">{status}</p>}
    </div>
  );
}

// ponytail: temporary manual add box until slice 4 fills the list from a meal plan.
function AddItem({ krogerStoreId }: { krogerStoreId?: string }) {
  const add = useMutation(api.listItems.add);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      // Without a Kroger store there's nothing to price against; the row asks for an estimate.
      const [product] = krogerStoreId ? await fetchPrices([{ name: trimmed }], krogerStoreId) : [null];
      await add({ name: trimmed, product: product ?? undefined });
      setName("");
    } catch {
      setError("Couldn't add that. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-1">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add an item, like chicken thighs"
          maxLength={80}
          className="min-w-0 flex-1 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-lg font-bold"
        />
        <button
          disabled={busy || !name.trim()}
          className="rounded-2xl border-b-4 border-leaf-dark bg-leaf px-5 font-black text-white disabled:opacity-60"
        >
          {busy ? "…" : "Add"}
        </button>
      </div>
      {error && <p className="text-sm font-bold text-carrot-dark">{error}</p>}
    </form>
  );
}

// One tap: put this week's regulars on the list (skips anything already there).
function AddRegulars({ krogerStoreId }: { krogerStoreId?: string }) {
  const regulars = useQuery(api.regulars.mine);
  const addToList = useMutation(api.regulars.addToList);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  if (!regulars || regulars.length === 0) return null;
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setNote(krogerStoreId ? "Checking today's prices…" : null);
          // Fresh prices at the current store (same product by id; top match if it never had one).
          const fresh = krogerStoreId
            ? await fetchPrices(regulars.map((r) => ({ name: r.name, productId: r.productId })), krogerStoreId)
            : [];
          const prices = regulars.map((r, n) => {
            const p = fresh[n];
            return {
              id: r._id,
              product: p ? { productId: p.productId, name: p.name, size: p.size, price: p.price, imageUrl: p.imageUrl } : undefined,
            };
          });
          const added = await addToList({ prices }).catch(() => -1);
          setBusy(false);
          setNote(added < 0 ? "Couldn't add regulars." : added === 0 ? "Regulars are already on your list (prices refreshed)." : `Added ${added} regulars at today's prices.`);
        }}
        className="rounded-2xl border-2 border-leaf bg-white px-4 py-2 font-black text-leaf-dark disabled:opacity-60"
      >
        🛒 Add regulars ({regulars.length})
      </button>
      {note && <span className="text-sm font-bold text-slate-500">{note}</span>}
    </div>
  );
}
