"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { BookOpen, CalendarDays, MessageCircle, ListChecks, Package, Wallet } from "lucide-react";

const LINKS = [
  { href: "/plan", label: "Plan", Icon: MessageCircle },
  { href: "/week", label: "Week", Icon: CalendarDays },
  { href: "/list", label: "List", Icon: ListChecks },
  { href: "/pantry", label: "Pantry", Icon: Package },
  { href: "/recipes", label: "Recipes", Icon: BookOpen },
  { href: "/budget", label: "Budget", Icon: Wallet },
];

// Market-stall header: the Mise sign, then the stalls you can visit.
export default function Nav() {
  const path = usePathname();
  // The landing page (/) has its own market-sign header; signed-in visitors there are redirected into the app.
  if (path === "/" || path.startsWith("/sign-in") || path === "/welcome" || path === "/terms" || path === "/privacy") return null;
  return (
    <header className="sticky top-0 z-20 border-b-2 border-line bg-ground/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-xl items-center gap-1 px-2 py-2 lg:max-w-6xl lg:px-8">
        <Link href="/" className="font-sign mr-0.5 text-xl text-tomato lg:text-2xl" aria-label="Mise home">
          Mise
        </Link>
        <nav className="flex flex-1 items-center justify-end gap-0 overflow-x-auto" aria-label="Main">
          {LINKS.map(({ href, label, Icon }) => {
            const active = path === href || path.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-1 py-1 text-xs font-extrabold lg:flex-row lg:gap-1.5 lg:px-3 lg:py-2 lg:text-sm ${
                  active ? "bg-ink text-chalk" : "text-ink-soft hover:bg-line"
                }`}
              >
                <Icon size={18} strokeWidth={2.5} aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
        <UserButton />
      </div>
    </header>
  );
}
