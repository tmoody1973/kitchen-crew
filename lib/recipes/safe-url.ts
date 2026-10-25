// The server fetches links Tarik pastes, so refuse anything that points at private or local machines.

const PRIVATE_HOST = [
  /^localhost$/i,
  /\.local$/i,
  /\.internal$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\./,
  /^\[?::1\]?$/,
  /^\[?f[cd][0-9a-f]{2}:/i,
  /^\[?fe80:/i,
];

/** A parsed http(s) URL safe to fetch, or null. */
export function safeUrl(input: string): URL | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  if (PRIVATE_HOST.some((re) => re.test(url.hostname))) return null;
  // ponytail: hostname check only; a public name that resolves to a private IP isn't caught (single-user app).
  return url;
}
