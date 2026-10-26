import { HeartHandshake, Phone, TriangleAlert } from "lucide-react";
import { CREDIT, type FoodHelp, type HelpMode } from "@/lib/food-help";

export type FoodHelpResult = { ok: true; zip: string; mode: HelpMode; places: FoodHelp[] } | { ok: false; error: string };

const TITLE: Record<HelpMode, string> = {
  free: "Free food near",
  school: "School meal sites near",
  summer: "Summer meals near",
  wic: "WIC offices near",
};

// Food pantries, free meals, school meal sites, or WIC offices near a ZIP. Used in the chat and on /food-help.
export default function FoodHelpCard({ data }: { data: FoodHelpResult }) {
  if (!data.ok) {
    return (
      <p className="crate flex items-center gap-2 border-tomato px-4 py-3 font-bold text-tomato-dark" role="alert">
        <TriangleAlert size={18} strokeWidth={2.5} aria-hidden /> {data.error}
      </p>
    );
  }
  return (
    <div className="crate flex w-full flex-col gap-3 p-4">
      <p className="flex items-center gap-2 text-lg font-black">
        <HeartHandshake size={20} strokeWidth={2.75} className="text-tomato" aria-hidden /> {TITLE[data.mode]} {data.zip}
      </p>
      {data.places.length === 0 ? (
        <p className="font-bold text-ink-soft">None listed near {data.zip}. Call or text <strong>211</strong> for local food help, any time.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.places.map((p) => (
            <li key={`${p.name}-${p.address}`} className="border-t-2 border-line pt-3 first:border-0 first:pt-0">
              <p className="flex items-baseline justify-between gap-3">
                <span className="font-black leading-snug">{p.name}</span>
                {p.miles !== undefined && <span className="shrink-0 text-xs font-extrabold text-ink-soft">{p.miles} mi</span>}
              </p>
              <p className="text-sm text-ink-soft">
                {p.kind} · {p.address}
              </p>
              <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-sm font-extrabold">
                {p.phone && (
                  <a href={`tel:${p.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-1 underline">
                    <Phone size={14} strokeWidth={2.75} aria-hidden /> {p.phone}
                  </a>
                )}
                {p.website && (
                  <a href={p.website} target="_blank" rel="noreferrer" className="underline">
                    Details
                  </a>
                )}
                {p.walkIns && <span className="text-kale-ink">Walk-ins welcome</span>}
                {p.appointment && <span className="text-squash-ink">Appointment needed</span>}
              </p>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs font-bold text-ink-soft">
        Hours change: call ahead before you go. {CREDIT}; each listing comes from the source it names. Also: call or text 211.
      </p>
    </div>
  );
}
