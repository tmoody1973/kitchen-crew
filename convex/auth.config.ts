import { AuthConfig } from "convex/server";

// Convex trusts sign-in tokens from your Clerk app.
// CLERK_JWT_ISSUER_DOMAIN is set on the Convex deployment (npx convex env set ...), not in .env.local.
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
