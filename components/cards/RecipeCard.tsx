import Link from "next/link";

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
    return <p className="rounded-2xl bg-white px-4 py-3 font-bold text-carrot-dark">📖 {data.error}</p>;
  }
  return (
    <Link href={`/recipes/${data.recipeId}`} className="flex w-full gap-3 overflow-hidden rounded-2xl border-2 border-slate-200 bg-white p-3">
      {data.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- recipe photo from the source site
        <img src={data.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
      )}
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-wide text-leaf-dark">
          {data.sourceType === "youtube" ? "▶ YouTube" : "🌐"} {data.sourceName} · saved to My Recipes ✓
        </p>
        <p className="truncate text-lg font-black">{data.title}</p>
        <p className="text-sm font-bold text-slate-500">
          serves {data.servings}
          {data.totalMinutes ? ` · ${data.totalMinutes} min` : ""} · {data.ingredientCount} ingredients · {data.stepCount} steps
        </p>
        <p className="text-sm font-bold text-leaf-dark underline">View recipe →</p>
      </div>
    </Link>
  );
}
