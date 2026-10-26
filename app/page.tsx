import { auth } from "@clerk/nextjs/server";
import HomeRedirect from "@/components/HomeRedirect";
import Landing from "@/components/landing/Landing";

// Signed in: straight into the app (budget setup or the planner). Signed out: the landing page.
export default async function Home() {
  const { userId } = await auth();
  return userId ? <HomeRedirect /> : <Landing />;
}
