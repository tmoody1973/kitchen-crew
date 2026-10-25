// Copied from Tarik's Digero app (digero/convex/lib/youtubeUrlParser.ts).
/**
 * YouTube URL Parser Utility
 *
 * Extracts video IDs from various YouTube URL formats.
 * Supports youtube.com/watch, youtu.be, and youtube.com/shorts formats.
 */

/**
 * Regular expressions for different YouTube URL formats
 */
const YOUTUBE_URL_PATTERNS = {
  // Standard watch URL: youtube.com/watch?v=VIDEO_ID
  watch: /(?:youtube\.com\/watch\?(?:[^&]+&)*v=|youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
  // Short URL: youtu.be/VIDEO_ID
  short: /youtu\.be\/([a-zA-Z0-9_-]{11})/,
  // Shorts URL: youtube.com/shorts/VIDEO_ID
  shorts: /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  // Embed URL: youtube.com/embed/VIDEO_ID
  embed: /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  // Mobile URL: m.youtube.com/watch?v=VIDEO_ID
  mobile: /m\.youtube\.com\/watch\?(?:[^&]+&)*v=([a-zA-Z0-9_-]{11})/,
};

/**
 * Check if a URL is a YouTube URL
 *
 * @param url - URL to check
 * @returns True if the URL is a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  if (!url || typeof url !== "string") {
    return false;
  }

  const trimmedUrl = url.trim().toLowerCase();

  // Check for common YouTube domains
  return (
    trimmedUrl.includes("youtube.com") ||
    trimmedUrl.includes("youtu.be") ||
    trimmedUrl.includes("m.youtube.com")
  );
}

/**
 * Extract video ID from a YouTube URL
 *
 * Supports the following formats:
 * - youtube.com/watch?v=VIDEO_ID
 * - youtu.be/VIDEO_ID
 * - youtube.com/shorts/VIDEO_ID
 * - youtube.com/embed/VIDEO_ID
 * - m.youtube.com/watch?v=VIDEO_ID
 *
 * @param url - YouTube URL to parse
 * @returns Video ID or null if not a valid YouTube URL
 */
export function extractVideoId(url: string): string | null {
  if (!url || typeof url !== "string") {
    return null;
  }

  const trimmedUrl = url.trim();

  // Try each pattern
  for (const pattern of Object.values(YOUTUBE_URL_PATTERNS)) {
    const match = trimmedUrl.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // If no pattern matched but it looks like a video ID itself
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmedUrl)) {
    return trimmedUrl;
  }

  return null;
}

/**
 * Validate a YouTube video ID format
 *
 * YouTube video IDs are 11 characters long and contain
 * alphanumeric characters, underscores, and hyphens.
 *
 * @param videoId - Video ID to validate
 * @returns True if the video ID format is valid
 */
export function isValidVideoId(videoId: string): boolean {
  if (!videoId || typeof videoId !== "string") {
    return false;
  }

  return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
}

/**
 * Build a YouTube watch URL from a video ID
 *
 * @param videoId - YouTube video ID
 * @returns Full YouTube watch URL
 */
export function buildYouTubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Extract channel ID from various YouTube channel URL formats
 *
 * Supports:
 * - youtube.com/channel/CHANNEL_ID
 * - youtube.com/@username (handle format)
 * - youtube.com/c/customname (custom URL)
 *
 * @param url - YouTube channel URL
 * @returns Channel ID, handle, or custom name, or null if not valid
 */
export function extractChannelIdentifier(url: string): {
  type: "channel" | "handle" | "custom";
  value: string;
} | null {
  if (!url || typeof url !== "string") {
    return null;
  }

  const trimmedUrl = url.trim();

  // Channel ID format: /channel/UC...
  const channelMatch = trimmedUrl.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]+)/);
  if (channelMatch) {
    return { type: "channel", value: channelMatch[1] };
  }

  // Handle format: /@username
  const handleMatch = trimmedUrl.match(/youtube\.com\/@([a-zA-Z0-9_.-]+)/);
  if (handleMatch) {
    return { type: "handle", value: handleMatch[1] };
  }

  // Custom URL format: /c/customname
  const customMatch = trimmedUrl.match(/youtube\.com\/c\/([a-zA-Z0-9_.-]+)/);
  if (customMatch) {
    return { type: "custom", value: customMatch[1] };
  }

  return null;
}

/**
 * Parse ISO 8601 duration to seconds
 *
 * YouTube uses ISO 8601 duration format (e.g., "PT4M13S" for 4 minutes 13 seconds)
 *
 * @param duration - ISO 8601 duration string
 * @returns Duration in seconds
 */
export function parseISO8601Duration(duration: string): number {
  if (!duration) {
    return 0;
  }

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) {
    return 0;
  }

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Format duration in seconds to human-readable string
 *
 * @param seconds - Duration in seconds
 * @returns Formatted duration (e.g., "4:13" or "1:04:13")
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0) {
    return "0:00";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
