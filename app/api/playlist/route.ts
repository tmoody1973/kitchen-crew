import { auth } from "@clerk/nextjs/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { convexToken } from "@/lib/convex-token";
import { fetchPlaylist } from "@/lib/recipes/playlist";

// POST → { added, total }: new videos from Tarik's recipe playlist join My Recipes as "not read yet".
export async function POST() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Not signed in" }, { status: 401 });
  const playlistId = process.env.YOUTUBE_PLAYLIST_ID;
  if (!playlistId) return Response.json({ error: "No playlist set up yet (YOUTUBE_PLAYLIST_ID)." }, { status: 500 });
  const token = await convexToken();
  if (!token) return Response.json({ error: "Not signed in" }, { status: 401 });
  try {
    const videos = await fetchPlaylist(playlistId);
    // Oldest first, so the newest playlist videos end up at the top of My Recipes.
    const added = await fetchMutation(api.recipes.addUnread, { videos: [...videos].reverse() }, { token });
    return Response.json({ added, total: videos.length });
  } catch (err) {
    console.error("Playlist sync failed:", err);
    return Response.json({ error: "Couldn't reach YouTube. Try again in a minute." }, { status: 502 });
  }
}
