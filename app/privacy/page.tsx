import type { Metadata } from "next";
import LegalPage, { ISSUES_URL } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy · Mise" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" other={{ href: "/terms", label: "Terms of Service" }}>
      <p>
        Mise is a small grocery-budget app built by Tarik Moody for a Devpost hackathon. This page says, in plain English, what
        Mise keeps, who it shares it with to work, and how to have it deleted. Mise does not sell your data, show ads, or use
        tracking or analytics scripts.
      </p>

      <h2>What Mise keeps</h2>
      <ul>
        <li><strong>Your account:</strong> your email address and name (or your Google account&apos;s name and email if you sign in with Google), handled by Clerk.</li>
        <li><strong>What you enter:</strong> weekly budgets, the name you give the crew and who eats at home, shopping lists and what you paid, pantry items, regulars, stores you picked, recipes you save, week plans, planner chats, and receipt totals (store, subtotal, tax, fees, total).</li>
        <li><strong>Receipt photos are not kept.</strong> A photo is sent to be read once, then discarded; only the numbers you confirm are saved.</li>
        <li><strong>On your device:</strong> a sign-in cookie (Clerk), small display preferences in your browser (list view, US or metric, board width, compare store), and, if you connect a Kroger account, Kroger access keys in secure cookies that only Mise&apos;s server can read. Kroger keys are never stored in Mise&apos;s database.</li>
      </ul>

      <h2>Who Mise shares data with, and why</h2>
      <p>Only what each service needs to do its part:</p>
      <ul>
        <li><strong>Clerk</strong>: sign-in.</li>
        <li><strong>Convex</strong>: the database that stores what&apos;s listed above.</li>
        <li><strong>Vercel</strong>: hosts the website.</li>
        <li><strong>Anthropic (Claude)</strong>: your planner chat messages, your saved recipe titles and pantry, recipe pages you import, and receipt photos are sent to Claude to plan dinners, read recipes, pick products, and read receipts. Anthropic does not use this data to train its models under its commercial terms.</li>
        <li><strong>Kroger</strong>: ingredient names and store IDs to look up prices; if you connect your Kroger account, the products on your list are added to your Kroger-family cart (Pick &apos;n Save, Metro Market). Mise only requests permission to add to your cart.</li>
        <li><strong>TinyFish</strong>: recipe search words and recipe web addresses, to search the web and read recipe pages.</li>
        <li><strong>YouTube (Google)</strong>: video links, to read a recipe video&apos;s description and captions.</li>
        <li><strong>Feed America</strong> (feedam.org): a ZIP code and the kind of help you&apos;re looking for, to list nearby food pantries, free meals, school meal sites and WIC offices.</li>
        <li><strong>USDA</strong>: a store&apos;s map location, to list nearby stores that take SNAP.</li>
        <li><strong>Instacart</strong>: only when you tap &ldquo;Send to Instacart&rdquo;, the item names and amounts on your list.</li>
      </ul>
      <p>Each of these services handles data under its own privacy policy.</p>

      <h2>How long it&apos;s kept, and deleting it</h2>
      <p>
        Your data stays until you ask for it to be deleted. To delete your account and everything Mise stored for it, open a
        request at <a href={ISSUES_URL}>github.com/tmoody1973/kitchen-crew/issues</a> titled &ldquo;Delete my Mise data&rdquo;. Don&apos;t
        include personal details in the issue; give only the first letter of your sign-in email and the date you joined, and
        you&apos;ll be contacted to confirm. Disconnect Kroger at any time by clearing this site&apos;s cookies, or remove Mise in
        your Kroger account settings.
      </p>

      <h2>Children</h2>
      <p>Mise is for adults managing a household&apos;s groceries. It is not meant for children under 13, and it doesn&apos;t knowingly collect their information. Household members you count during setup are numbers only (for example, &ldquo;2 kids&rdquo;), not names.</p>

      <h2>Security</h2>
      <p>Data travels over encrypted connections (HTTPS). Each account can only see its own data. No system is perfectly secure; this is a hackathon project, so please don&apos;t store anything in it you&apos;d consider sensitive.</p>

      <h2>Changes and questions</h2>
      <p>If this policy changes, the date at the top changes too. Questions: <a href={ISSUES_URL}>open an issue on GitHub</a>.</p>
    </LegalPage>
  );
}
