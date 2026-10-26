import type { Metadata, Viewport } from "next";
import { Bowlby_One, Figtree } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import Nav from "@/components/Nav";
import "./globals.css";

// Self-hosted by next/font: Bowlby One for signs and numbers, Figtree for reading.
const bowlby = Bowlby_One({ variable: "--font-bowlby", weight: "400", subsets: ["latin"] });
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"], weight: ["500", "600", "700", "800", "900"] });

export const metadata: Metadata = {
  title: "Mise",
  description: "Plan dinners, shop at real prices, and stay under your weekly grocery budget.",
};

export const viewport: Viewport = { themeColor: "#1f2a24" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // Font variables live on <html> so the theme tokens defined at :root (--font-sans, --font-sign) can resolve them.
    <html lang="en" className={`${bowlby.variable} ${figtree.variable}`}>
      <body className="font-sans antialiased">
        <ClerkProvider dynamic localization={{ signIn: { start: { title: "Continue to Mise", titleCombined: "Continue to Mise" } } }}>
          <Nav />
          <main className="mx-auto max-w-xl px-3 py-4 lg:max-w-6xl lg:px-8 lg:py-6">
            <ConvexClientProvider>{children}</ConvexClientProvider>
          </main>
        </ClerkProvider>
      </body>
    </html>
  );
}
