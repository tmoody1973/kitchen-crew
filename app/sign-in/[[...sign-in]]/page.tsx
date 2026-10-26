import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

// Mise's own sign-in page (instead of Clerk's hosted one): the market sign, one plain sentence, then the form.
export default function SignInPage() {
  return (
    <div className="-mt-4 flex flex-col items-center gap-6 lg:-mt-6">
      <div className="awning mx-[calc(50%-50vw)] h-7 self-stretch sm:h-9" aria-hidden="true" />
      <Link href="/" className="font-sign text-4xl text-tomato" aria-label="Mise home">
        Mise
      </Link>
      <div className="flex max-w-sm flex-col gap-2 text-center">
        <h1 className="sign">Sign in</h1>
        <p className="font-bold text-ink-soft">
          Mise keeps one household&apos;s weekly groceries under budget. Judges: sign in with the email and password from the
          submission&apos;s testing instructions (not Google).
        </p>
      </div>
      <SignIn
        fallbackRedirectUrl="/plan"
        appearance={{
          variables: {
            colorPrimary: "#d33722",
            colorForeground: "#1d241f",
            colorInputForeground: "#1d241f",
            colorBackground: "#ffffff",
            fontFamily: "var(--font-sans)",
            borderRadius: "14px",
          },
          elements: { cardBox: "shadow-none border-2 border-line rounded-2xl" },
          // Email and password first: judges use the demo login; the household signs in with Google below.
          options: { socialButtonsPlacement: "bottom" },
        }}
      />
      <p className="text-sm font-bold text-ink-soft">
        By signing in you agree to the <Link href="/terms" className="underline">Terms</Link> and{" "}
        <Link href="/privacy" className="underline">Privacy Policy</Link>.
      </p>
    </div>
  );
}
