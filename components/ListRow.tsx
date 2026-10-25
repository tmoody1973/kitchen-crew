"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { estimateTotal, formatMoney, rowStatus } from "@/lib/tally";
import ProductPicker from "./ProductPicker";

/** "" → cleared box; anything else must be a non-negative number. */
function parseAmount(text: string): number | undefined | "invalid" {
  if (text.trim() === "") return undefined;
  const n = Number(text.replace("$", ""));
  return Number.isFinite(n) && n >= 0 ? n : "invalid";
}

const STATUS_STYLE = {
  under: "border-leaf bg-leaf/10",
  over: "border-carrot bg-carrot/10",
  none: "border-slate-200 bg-white",
};

// One shopping list row: item · product · packs · estimate · what you paid, colored by how it compares.
export default function ListRow({ item, krogerStoreId }: { item: Doc<"listItems">; krogerStoreId?: string }) {
  const setPaid = useMutation(api.listItems.setPaid);
  const setEstimate = useMutation(api.listItems.setEstimate);
  const setPacks = useMutation(api.listItems.setPacks);
  const setProduct = useMutation(api.listItems.setProduct);
  const remove = useMutation(api.listItems.remove);
  const [paidText, setPaidText] = useState(item.paid?.toString() ?? "");
  const [estimateText, setEstimateText] = useState("");
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const packs = item.packs ?? 1;
  const total = estimateTotal(item.estimate, packs);
  const status = rowStatus(total, item.paid);
  const versus = item.estimateSource === "kroger" ? "Kroger" : "your estimate";
  const fail = () => setError("Couldn't save. Try again.");

  async function savePaid() {
    const paid = parseAmount(paidText);
    if (paid === "invalid") return setError("Type a price like 4.29");
    if (paid === item.paid) return;
    setError(null);
    await setPaid({ id: item._id, paid }).catch(fail);
  }

  async function saveEstimate() {
    const estimate = parseAmount(estimateText);
    if (estimate === "invalid" || estimate === undefined) return setError("Type an estimate like 4.29");
    setError(null);
    await setEstimate({ id: item._id, estimate }).catch(fail);
  }

  return (
    <li className={`flex flex-col gap-2 rounded-2xl border-2 p-3 ${STATUS_STYLE[status]}`}>
      <div className="flex items-start justify-between gap-3">
        {item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- tiny Kroger thumbnail, no optimizer needed
          <img src={item.imageUrl} alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-lg bg-white object-contain" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-black">{item.name}</p>
          {item.productName && (
            <p className="text-xs font-bold text-slate-500">
              {item.productName}
              {item.size && ` · ${item.size}`}
            </p>
          )}
          {item.estimate !== undefined ? (
            <p className="text-sm font-bold text-slate-600">
              {item.estimateSource === "kroger" ? "Kroger" : "Your estimate"}:{" "}
              {packs > 1 ? `${packs} × ${formatMoney(item.estimate)} = ${formatMoney(total!)}` : formatMoney(item.estimate)}
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveEstimate();
              }}
              className="flex items-center gap-2 text-sm font-bold text-slate-500"
            >
              No price found ·
              <input
                inputMode="decimal"
                placeholder="estimate"
                value={estimateText}
                onChange={(e) => setEstimateText(e.target.value)}
                onBlur={() => estimateText && saveEstimate()}
                className="w-20 rounded-lg border-2 border-slate-200 px-2 py-1"
                aria-label={`Estimate for ${item.name}`}
              />
            </form>
          )}
        </div>
        <label className="flex shrink-0 items-center gap-1 font-black">
          <span className="text-slate-400">$</span>
          <input
            inputMode="decimal"
            placeholder="paid"
            value={paidText}
            onChange={(e) => setPaidText(e.target.value)}
            onBlur={savePaid}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="w-24 rounded-xl border-2 border-slate-200 bg-white px-3 py-3 text-right text-lg"
            aria-label={`What you paid for ${item.name}`}
          />
        </label>
      </div>

      <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
        <span className="flex items-center gap-1" aria-label={`${packs} packages`}>
          <button
            type="button"
            disabled={packs <= 1}
            onClick={() => setPacks({ id: item._id, packs: packs - 1 }).catch(fail)}
            className="h-9 w-9 rounded-full border-2 border-slate-200 bg-white font-black disabled:opacity-40"
            aria-label="One fewer package"
          >
            −
          </button>
          <span className="w-8 text-center">×{packs}</span>
          <button
            type="button"
            disabled={packs >= 50}
            onClick={() => setPacks({ id: item._id, packs: packs + 1 }).catch(fail)}
            className="h-9 w-9 rounded-full border-2 border-slate-200 bg-white font-black disabled:opacity-40"
            aria-label="One more package"
          >
            +
          </button>
        </span>
        {krogerStoreId && (
          <button type="button" onClick={() => setPicking(!picking)} className="text-leaf-dark underline">
            {item.productId ? "Change brand" : "Find at Kroger"}
          </button>
        )}
        <button
          type="button"
          onClick={() => remove({ id: item._id }).catch(fail)}
          className="ml-auto rounded-full px-3 py-2 text-slate-500 hover:bg-slate-100"
          aria-label={`Remove ${item.name}`}
        >
          ✕ Remove
        </button>
      </div>

      {picking && krogerStoreId && (
        <ProductPicker
          name={item.name}
          storeId={krogerStoreId}
          currentId={item.productId}
          onPick={(p) => {
            setPicking(false);
            setProduct({ id: item._id, product: p }).catch(fail);
          }}
          onClose={() => setPicking(false)}
        />
      )}

      {status !== "none" && (
        <p className={`text-sm font-extrabold ${status === "under" ? "text-leaf-dark" : "text-carrot-dark"}`}>
          {status === "under"
            ? `Nice! ${formatMoney(total! - item.paid!)} less than ${versus}`
            : `${formatMoney(item.paid! - total!)} more than ${versus}`}
        </p>
      )}
      {error && <p className="text-sm font-bold text-carrot-dark">{error}</p>}
    </li>
  );
}
