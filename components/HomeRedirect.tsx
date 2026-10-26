"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { isWeekActive } from "@/lib/tally";

// First stop after sign-in: a brand-new account → Welcome (who's eating); no active week → Budget Setup; otherwise → the planner.
export default function HomeRedirect() {
  const week = useQuery(api.weeks.latest);
  const household = useQuery(api.household.mine);
  const router = useRouter();

  useEffect(() => {
    if (week === undefined || household === undefined) return; // still loading
    if (week === null && !household.onboarded) return router.replace("/welcome");
    const active = week !== null && isWeekActive(week.startDate, Date.now());
    router.replace(active ? "/plan" : "/budget");
  }, [week, household, router]);

  return <p className="p-8 text-center font-bold text-ink-soft">Checking your week…</p>;
}
