import Link from "next/link";
import { ArrowRight, BookOpenCheck, Globe, PlayCircle, TriangleAlert } from "lucide-react";

export type RecipeImport =
  | {
      ok: true;
      recipeId: string;
      title: string;
      sourceName: string;
      sourceType: "web" | "youtube";
      imageUrl?: string;
      servings: number;
      totalMinutes?: number;
      ingredientCount: number;
      stepCount: number;
    }
  | { ok: false; error: string };

// Shown in the chat after the crew reads a recipe link.
export default function RecipeCard({ data }: { data: RecipeImport }) {
  if (!data.ok) {
    return (
      <p className="crate flex items-center gap-2 border-tomato px-4 py-3 font-bold text-tomato-dark" role="alert">
        <TriangleAlert size={18} strokeWidth={2.5} aria-hidden /> {data.error}
      </p>
    );
  }
  const Source = data.sourceType === "youtube" ? PlayCircle : Globe;
  return (
    <Link href={`/recipes/${data.recipeId}`} className="crate flex w-full gap-3 overflow-hidden p-3 hover:border-ink">
      {data.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- recipe photo from the source site
        <img src={data.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
      )}
      <div className="min-w-0">
        <p className="flex items-center gap-1 text-xs font-extrabold text-ink-soft">
          <Source size={14} strokeWidth={2.5} aria-hidden /> {data.sourceName}
          <span className="ml-1 inline-flex items-center gap-1 text-ink">
            <BookOpenCheck size={14} strokeWidth={2.5} aria-hidden /> saved
          </span>
        </p>
        <p className="line-clamp-2 text-lg font-black leading-snug">{data.title}</p>
        <p className="text-sm font-bold text-ink-soft">
          serves {data.servings}
          {data.totalMinutes ? ` · ${data.totalMinutes} min` : ""} · {data.ingredientCount} ingredients · {data.stepCount} steps
        </p>
        <p className="mt-0.5 inline-flex items-center gap-1 text-sm font-extrabold underline">
          View recipe <ArrowRight size={14} strokeWidth={3} aria-hidden />
        </p>
      </div>
    </Link>
  );
}
