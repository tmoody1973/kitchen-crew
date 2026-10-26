"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AuthLoading, Authenticated, ConvexReactClient, Unauthenticated } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/** Shows the app only once Convex accepts the Clerk sign-in. The public landing page (/) skips this for signed-out visitors. */
function DatabaseGate({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { isSignedIn } = useAuth();
  // Signed-out visitors can only reach "/" and "/sign-in" (the middleware sends every other page to sign-in); neither needs the database.
  if ((path === "/" || path.startsWith("/sign-in") || path === "/terms" || path === "/privacy") && !isSignedIn) return <>{children}</>;
  return (
    <>
      <AuthLoading>
        <p className="p-8 text-center font-extrabold text-ink-soft">Waking up the crew…</p>
      </AuthLoading>
      <Unauthenticated>
        <p className="p-8 text-center font-extrabold text-ink-soft">
          Signed in, but the database didn&apos;t accept it. Check CLERK_JWT_ISSUER_DOMAIN on Convex.
        </p>
      </Unauthenticated>
      <Authenticated>{children}</Authenticated>
    </>
  );
}

// Hands Clerk's sign-in token to Convex.
export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <DatabaseGate>{children}</DatabaseGate>
    </ConvexProviderWithClerk>
  );
}
