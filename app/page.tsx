"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { isWeekActive } from "@/lib/tally";

// First stop after sign-in: no active week → Budget Setup; otherwise → the planner.
export default function Home() {
  const week = useQuery(api.weeks.latest);
  const router = useRouter();

  useEffect(() => {
    if (week === undefined) return; // still loading
    const active = week !== null && isWeekActive(week.startDate, Date.now());
    router.replace(active ? "/plan" : "/budget");
  }, [week, router]);

  return <p className="p-8 text-center font-bold text-slate-500">Checking your week…</p>;
}
