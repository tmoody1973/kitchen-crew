// YouTube: title/description/thumbnail from the official Data API; spoken transcript via the public video page.
// Transcript functions ported from Tarik's Digero app (digero/convex/actions/youtube/fetchCaptions.ts).
import { isValidVideoId, parseISO8601Duration } from "./youtubeUrlParser";

export type VideoInfo = {
  title: string;
  description: string;
  channel: string;
  thumbnail?: string;
  minutes?: number;
};

export async function fetchVideoInfo(videoId: string): Promise<VideoInfo | null> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key || !isValidVideoId(videoId)) return null;
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${key}`,
    { signal: AbortSignal.timeout(15_000) },
  );
  if (!res.ok) throw new Error(`YouTube API ${res.status}`);
  const item = ((await res.json()) as { items?: any[] }).items?.[0];
  if (!item) return null;
  const t = item.snippet.thumbnails ?? {};
  return {
    title: item.snippet.title,
    description: item.snippet.description ?? "",
    channel: item.snippet.channelTitle,
    thumbnail: (t.maxres ?? t.standard ?? t.high ?? t.medium ?? t.default)?.url,
    minutes: item.contentDetails?.duration ? Math.round(parseISO8601Duration(item.contentDetails.duration) / 60) : undefined,
  };
}

function extractTranscriptUrl(html: string): string | null {
  const patterns = [/"captionTracks":\s*\[([\s\S]*?)\]/, /"playerCaptionsTracklistRenderer"[\s\S]*?"captionTracks":\s*\[([\s\S]*?)\]/];
  for (const pattern of patterns) {
    const urlMatch = html.match(pattern)?.[1]?.match(/"baseUrl":\s*"([^"]+)"/);
    if (urlMatch?.[1]) return urlMatch[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/");
  }
  return null;
}

function parseTranscriptXml(xml: string): string {
  const out: string[] = [];
  const textPattern = /<text[^>]*start="([\d.]+)"[^>]*dur="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
  let m;
  while ((m = textPattern.exec(xml)) !== null) {
    const text = m[3]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\n/g, " ")
      .trim();
    if (text) out.push(text);
  }
  return out.join(" ");
}

/** The video's spoken words, or null if it has no captions (or YouTube changed its page). */
export async function fetchTranscript(videoId: string): Promise<string | null> {
  if (!isValidVideoId(videoId)) return null;
  try {
    const page = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { "Accept-Language": "en-US,en;q=0.9", "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!page.ok) return null;
    const url = extractTranscriptUrl(await page.text());
    if (!url) return null;
    const xml = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!xml.ok) return null;
    const text = parseTranscriptXml(await xml.text());
    return text || null;
  } catch (err) {
    console.error("YouTube transcript fetch failed:", err);
    return null;
  }
}
