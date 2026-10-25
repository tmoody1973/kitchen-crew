// Every video in a YouTube playlist, via the official Data API (50 per page).
import { isValidVideoId } from "./youtubeUrlParser";

export type PlaylistVideo = { videoId: string; title: string; channel: string; thumbnail?: string };

const MAX_PAGES = 10; // ponytail: 500 videos; raise if the playlist outgrows it

type Item = {
  snippet: {
    title: string;
    videoOwnerChannelTitle?: string;
    resourceId: { videoId: string };
    thumbnails?: Record<string, { url: string }>;
  };
};

export async function fetchPlaylist(playlistId: string): Promise<PlaylistVideo[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY is not set");
  const videos: PlaylistVideo[] = [];
  let pageToken = "";
  for (let page = 0; page < MAX_PAGES; page++) {
    const url =
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50` +
      `&playlistId=${encodeURIComponent(playlistId)}&key=${key}${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`YouTube playlist ${res.status}`);
    const data = (await res.json()) as { items?: Item[]; nextPageToken?: string };
    for (const { snippet } of data.items ?? []) {
      const videoId = snippet.resourceId.videoId;
      // Private and deleted videos stay in a playlist but have no channel.
      if (!isValidVideoId(videoId) || !snippet.videoOwnerChannelTitle) continue;
      const t = snippet.thumbnails ?? {};
      videos.push({
        videoId,
        title: snippet.title,
        channel: snippet.videoOwnerChannelTitle,
        thumbnail: (t.maxres ?? t.standard ?? t.high ?? t.medium ?? t.default)?.url,
      });
    }
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return videos;
}
