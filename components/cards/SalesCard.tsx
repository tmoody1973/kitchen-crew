import Link from "next/link";
import { BadgePercent, TriangleAlert } from "lucide-react";
import { formatMoney } from "@/lib/tally";
import type { Sale, SaleScope } from "@/lib/sales";

export type SalesResult =
  | { ok: true; scope: SaleScope; storeName?: string; checked: number; sales: Sale[] }
  | { ok: false; error: string };

const WHAT: Record<SaleScope, string> = {
  needed: "on your shopping list",
  regulars: "you usually buy",
  recipes: "your saved recipes use most",
};

// Shown in the chat after the crew checks sales. Every number here comes from Kroger through code.
export default function SalesCard({ data }: { data: SalesResult }) {
  if (!data.ok) {
    return (
      <p className="crate flex items-center gap-2 border-tomato px-4 py-3 font-bold text-tomato-dark" role="alert">
        <TriangleAlert size={18} strokeWidth={2.5} aria-hidden /> {data.error}
      </p>
    );
  }
  const at = data.storeName ? ` at ${data.storeName}` : "";
  return (
    <div className="crate flex w-full flex-col gap-3 p-4">
      <p className="flex items-center gap-2 text-lg font-black">
        <BadgePercent size={20} strokeWidth={2.75} className="text-kale-ink" aria-hidden />
        {data.sales.length > 0 ? `${data.sales.length} on sale${at}` : `Nothing on sale${at} right now`}
      </p>
      <p className="-mt-2 text-xs font-bold text-ink-soft">
        Checked {data.checked} item{data.checked === 1 ? "" : "s"} {WHAT[data.scope]}. Kroger&apos;s sale prices today; sales can end before you shop.
      </p>
      {data.sales.length > 0 && (
        <ul className="flex flex-col gap-2 text-sm">
          {data.sales.map((s) => (
            <li key={`${s.item}-${s.productId}`} className="flex items-center gap-3">
              {s.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- tiny Kroger thumbnail
                <img src={s.imageUrl} alt="" width={36} height={36} className="h-9 w-9 shrink-0 object-contain" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold">{s.item}</p>
                <p className="truncate text-xs text-ink-soft">
                  {s.name}
                  {s.size ? ` · ${s.size}` : ""}
                </p>
                <p className="text-xs font-extrabold text-kale-ink">
                  was {formatMoney(s.regularPrice)} · save {formatMoney(s.save)}
                </p>
                {s.recipes && s.recipes.length > 0 && (
                  <p className="text-xs font-bold text-ink-soft">
                    In:{" "}
                    {s.recipes.map((r, n) => (
                      <span key={r.id}>
                        {n > 0 && ", "}
                        <Link href={`/recipes/${r.id}`} className="underline">
                          {r.title}
                        </Link>
                      </span>
                    ))}
                  </p>
                )}
              </div>
              <span className="tag shrink-0 text-base">{formatMoney(s.price)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
