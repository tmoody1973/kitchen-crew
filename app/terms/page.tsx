import type { Metadata } from "next";
import LegalPage, { ISSUES_URL } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms of Service · Mise" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" other={{ href: "/privacy", label: "Privacy Policy" }}>
      <p>
        Mise is a free proof-of-concept app built by Tarik Moody for the Devpost &ldquo;Build With AI: Basics&rdquo; hackathon. By
        using it you agree to these terms. If you don&apos;t agree, please don&apos;t use Mise.
      </p>

      <h2>What Mise is, and isn&apos;t</h2>
      <ul>
        <li>Mise helps plan dinners and track grocery spending against a weekly budget. It is not financial, nutritional, medical, or dietary advice.</li>
        <li><strong>Prices are estimates.</strong> They come from Kroger at the time they&apos;re looked up and can differ at the register; sales can end. The tally uses what you type or confirm as paid.</li>
        <li><strong>AI can make mistakes.</strong> Dinner plans, recipe readings, product picks, and receipt readings come from Claude, an AI model. Check ingredient amounts against the original recipe, check receipt numbers before confirming, and always check labels for allergens.</li>
        <li>Budget suggestions use USDA food-cost figures as a starting point, not a recommendation for your situation.</li>
      </ul>

      <h2>Your account and your content</h2>
      <ul>
        <li>You&apos;re responsible for activity on your account and for keeping your sign-in safe.</li>
        <li>What you enter stays yours. You let Mise store and process it only to run the app, as described in the <a href="/privacy">Privacy Policy</a>.</li>
        <li>Saved recipes belong to their creators. Mise keeps a link to the original page or video; use saved recipes for your own cooking.</li>
      </ul>

      <h2>Other services</h2>
      <p>
        Mise works with Kroger, Instacart, YouTube, TinyFish, Anthropic, Clerk, Convex, and Vercel. Orders you place at Kroger-family
        stores or Instacart are between you and them, under their terms. Connecting a Kroger account only lets Mise add items to
        your cart; you review and check out yourself. &ldquo;Send to Instacart&rdquo; currently opens Instacart&apos;s test store,
        where no real orders are placed.
      </p>

      <h2>Fair use</h2>
      <p>Don&apos;t misuse Mise: no attempts to access other people&apos;s data, overload the service, or use it for anything unlawful. Accounts that do may be removed.</p>

      <h2>No warranty, limited liability</h2>
      <p>
        Mise is provided &ldquo;as is&rdquo;, free, and may change, break, or shut down at any time, and your data may be lost.
        To the extent the law allows, Tarik Moody isn&apos;t liable for any loss arising from using Mise, including money spent
        based on its estimates.
      </p>

      <h2>Changes and contact</h2>
      <p>These terms may change; the date at the top shows the latest version. Questions: <a href={ISSUES_URL}>open an issue on GitHub</a>.</p>
    </LegalPage>
  );
}
