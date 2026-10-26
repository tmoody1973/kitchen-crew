import Link from "next/link";
import type { ReactNode } from "react";

export const ISSUES_URL = "https://github.com/tmoody1973/kitchen-crew/issues";
export const UPDATED = "October 26, 2026";

// Shared frame for the Terms and Privacy pages: readable width, the Mise sign home, and the other policy linked.
export default function LegalPage({ title, other, children }: { title: string; other: { href: string; label: string }; children: ReactNode }) {
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-4 py-4 leading-relaxed [&_h2]:mt-4 [&_h2]:font-black [&_h2]:text-xl [&_li]:ml-5 [&_li]:list-disc [&_a]:font-extrabold [&_a]:underline">
      <Link href="/" className="font-sign self-start text-3xl text-tomato no-underline!" aria-label="Mise home">
        Mise
      </Link>
      <h1 className="sign">{title}</h1>
      <p className="text-sm font-bold text-ink-soft">Last updated {UPDATED}</p>
      {children}
      <p className="mt-6 border-t-2 border-line pt-4 text-sm font-bold text-ink-soft">
        See also: <Link href={other.href}>{other.label}</Link> · <Link href="/">Mise home</Link>
      </p>
    </article>
  );
}
