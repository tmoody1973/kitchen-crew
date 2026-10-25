"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { categoryOf, estimateTotal, formatMoney, rowStatus } from "@/lib/tally";
import { Check, Minus, Plus, ShoppingBasket, TrendingUp, Utensils, X } from "lucide-react";
import ProductPicker from "./ProductPicker";

/** "" → cleared box; anything else must be a non-negative number. */
function parseAmount(text: string): number | undefined | "invalid" {
  if (text.trim() === "") return undefined;
  const n = Number(text.replace("$", ""));
  return Number.isFinite(n) && n >= 0 ? n : "invalid";
}

const STATUS_STYLE = {
  under: "border-kale bg-kale-wash",
  over: "border-squash bg-squash-wash",
  none: "border-line bg-white",
};

// One shopping list row: item · product · packs · estimate · what you paid, colored by how it compares.
export default function ListRow({ item, krogerStoreId }: { item: Doc<"listItems">; krogerStoreId?: string }) {
  const setPaid = useMutation(api.listItems.setPaid);
  const setEstimate = useMutation(api.listItems.setEstimate);
  const setPacks = useMutation(api.listItems.setPacks);
  const setProduct = useMutation(api.listItems.setProduct);
  const remove = useMutation(api.listItems.remove);
  const setCategory = useMutation(api.listItems.setCategory);
  const category = categoryOf(item);
  const [paidText, setPaidText] = useState(item.paid?.toString() ?? "");
  const [estimateText, setEstimateText] = useState("");
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const packs = item.packs ?? 1;
  const total = estimateTotal(item.estimate, packs);
  const status = rowStatus(total, item.paid);
  const versus = total !== undefined ? `the ${formatMoney(total)} estimate` : "the estimate";
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

  const CategoryIcon = category === "dinner" ? Utensils : ShoppingBasket;
  return (
    <li className={`flex flex-col gap-2 rounded-2xl border-2 p-3 ${STATUS_STYLE[status]}`}>
      <div className="flex items-center gap-3">
        {item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- tiny Kroger thumbnail, no optimizer needed
          <img src={item.imageUrl} alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-lg bg-white object-contain" />
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-lg font-black leading-tight">
            <button
              type="button"
              onClick={() => setCategory({ id: item._id, category: category === "dinner" ? "extra" : "dinner" }).catch(fail)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-chalk"
              aria-label={`${category === "dinner" ? "Dinner ingredient" : "Extra"}; tap to switch`}
              title={category === "dinner" ? "Dinner ingredient (tap to make it an extra)" : "Extra (tap to make it a dinner ingredient)"}
            >
              <CategoryIcon size={15} strokeWidth={2.75} aria-hidden />
            </button>
            <span className="truncate">{item.name}</span>
          </p>
          {item.productName && (
            <p className="mt-0.5 truncate text-xs font-bold text-ink-soft">
              {item.productName}
              {item.size && ` · ${item.size}`}
            </p>
          )}
          {item.estimate === undefined && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveEstimate();
              }}
              className="mt-1 flex items-center gap-2 text-sm font-bold text-ink-soft"
            >
              No price found
              <input
                inputMode="decimal"
                placeholder="estimate"
                value={estimateText}
                onChange={(e) => setEstimateText(e.target.value)}
                onBlur={() => estimateText && saveEstimate()}
                className="field w-24 px-2 py-1 text-sm"
                aria-label={`Estimate for ${item.name}`}
              />
            </form>
          )}
        </div>
      </div>

      {/* Price line: the shelf tag on the left, the paid box on the right (within thumb reach). */}
      <div className="flex items-center gap-3">
        {item.estimate !== undefined && (
          <span className="tag text-base" title={`${item.estimateSource === "kroger" ? "Kroger" : "Your"} estimate`}>
            <span className="sr-only">{item.estimateSource === "kroger" ? "Kroger estimate " : "Your estimate "}</span>
            {formatMoney(total!)}
          </span>
        )}
        <label className="ml-auto flex shrink-0 items-center gap-2 text-sm font-extrabold text-ink-soft">
          Paid
          <span className="sr-only"> for {item.name}</span>
          <input
            inputMode="decimal"
            enterKeyHint="done"
            placeholder="paid"
            value={paidText}
            onChange={(e) => setPaidText(e.target.value)}
            onBlur={savePaid}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="field w-24 py-3 text-right text-lg"
          />
        </label>
      </div>

      {status !== "none" && (
        <p className={`flex items-center gap-1 text-sm font-extrabold ${status === "under" ? "text-kale-ink" : "text-squash-ink"}`}>
          {status === "under" ? <Check size={16} strokeWidth={3} aria-hidden /> : <TrendingUp size={16} strokeWidth={3} aria-hidden />}
          {status === "under"
            ? `Nice! ${formatMoney(total! - item.paid!)} under ${versus}`
            : `${formatMoney(item.paid! - total!)} more than ${versus}`}
        </p>
      )}

      <div className="flex items-center gap-2 text-sm font-bold text-ink-soft">
        <span className="flex items-center gap-1.5" aria-label={`${packs} ${packs === 1 ? "package" : "packages"}`}>
          <button
            type="button"
            disabled={packs <= 1}
            onClick={() => setPacks({ id: item._id, packs: packs - 1 }).catch(fail)}
            className="btn-round h-9 w-9"
            aria-label="One fewer package"
          >
            <Minus size={16} strokeWidth={3} aria-hidden />
          </button>
          <span className="font-sign w-8 text-center text-ink">×{packs}</span>
          <button
            type="button"
            disabled={packs >= 50}
            onClick={() => setPacks({ id: item._id, packs: packs + 1 }).catch(fail)}
            className="btn-round h-9 w-9"
            aria-label="One more package"
          >
            <Plus size={16} strokeWidth={3} aria-hidden />
          </button>
        </span>
        {krogerStoreId && (
          <button type="button" onClick={() => setPicking(!picking)} className="px-1 text-ink underline">
            {item.productId ? "Change brand" : "Find at Kroger"}
          </button>
        )}
        <button
          type="button"
          onClick={() => remove({ id: item._id }).catch(fail)}
          className="ml-auto flex items-center gap-1 rounded-full px-2 py-2 hover:bg-line"
          aria-label={`Remove ${item.name}`}
        >
          <X size={16} strokeWidth={3} aria-hidden /> Remove
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
      {error && <p className="text-sm font-bold text-tomato-dark" role="alert">{error}</p>}
    </li>
  );
}
