"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { BookOpen, MessageCircle, ListChecks, Package, Wallet } from "lucide-react";

const LINKS = [
  { href: "/plan", label: "Plan", Icon: MessageCircle },
  { href: "/list", label: "List", Icon: ListChecks },
  { href: "/pantry", label: "Pantry", Icon: Package },
  { href: "/recipes", label: "Recipes", Icon: BookOpen },
  { href: "/budget", label: "Budget", Icon: Wallet },
];

// Market-stall header: the Mise sign, then the stalls you can visit.
export default function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b-2 border-line bg-ground/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-xl items-center gap-2 px-3 py-2">
        <Link href="/" className="font-sign mr-1 text-2xl text-tomato" aria-label="Mise home">
          Mise
        </Link>
        <nav className="flex flex-1 items-center justify-end gap-0.5 overflow-x-auto" aria-label="Main">
          {LINKS.map(({ href, label, Icon }) => {
            const active = path === href || path.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-xs font-extrabold ${
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
