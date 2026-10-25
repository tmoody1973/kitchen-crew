"use client";

import { ReactNode } from "react";
import { AuthLoading, Authenticated, ConvexReactClient, Unauthenticated } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Hands Clerk's sign-in token to Convex, and only shows the app once Convex accepts it.
export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <AuthLoading>
        <p className="p-8 text-center font-extrabold text-ink-soft">Waking up the crew…</p>
      </AuthLoading>
      <Unauthenticated>
        <p className="p-8 text-center font-extrabold text-ink-soft">
          Signed in, but the database didn&apos;t accept it. Check CLERK_JWT_ISSUER_DOMAIN on Convex.
        </p>
      </Unauthenticated>
      <Authenticated>{children}</Authenticated>
    </ConvexProviderWithClerk>
  );
}
