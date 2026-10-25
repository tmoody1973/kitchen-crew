import type { Metadata } from "next";
import Link from "next/link";
import { Nunito } from "next/font/google";
import { ClerkProvider, UserButton } from "@clerk/nextjs";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import "./globals.css";

const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kitchen Crew",
  description: "Your kitchen crew keeps the grocery budget on track.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${nunito.variable} font-sans antialiased`}>
        <ClerkProvider dynamic>
          <header className="flex items-center justify-between gap-4 border-b-2 border-slate-200 bg-white px-4 py-3">
            <Link href="/" className="text-xl font-black text-leaf">
              Kitchen Crew
            </Link>
            <nav className="flex items-center gap-4 font-bold text-slate-600">
              <Link href="/budget">Budget</Link>
              <Link href="/plan">Plan</Link>
              <Link href="/list">List</Link>
              <Link href="/pantry">Pantry</Link>
              <UserButton />
            </nav>
          </header>
          <main className="mx-auto max-w-xl p-4">
            <ConvexClientProvider>{children}</ConvexClientProvider>
          </main>
        </ClerkProvider>
      </body>
    </html>
  );
}
