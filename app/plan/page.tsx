import TallyHeader from "@/components/TallyHeader";

export default function PlanPage() {
  return (
    <div className="flex flex-col gap-4">
      <TallyHeader />
      <p className="rounded-2xl bg-white p-4 font-bold text-slate-500">
        The crew&apos;s meal planner moves in soon. For now, your budget is set and the tally is ticking.
      </p>
    </div>
  );
}
