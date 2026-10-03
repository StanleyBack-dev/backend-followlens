// Single source of truth for how an Instagram @username becomes the stable
// key used across the app. Instagram usernames are case-insensitive and may
// be written with a leading @ or as a full profile URL in the export file.
export function normalizeUsername(raw: string): string | null {
  let value = raw.trim();
  if (!value) return null;

  // Accept a profile URL (the export stores an href alongside the value).
  const urlMatch = value.match(/instagram\.com\/([^/?#]+)/i);
  if (urlMatch) value = urlMatch[1];

  value = value.replace(/^@+/, "").trim().toLowerCase();

  // Instagram allows letters, digits, dot and underscore, up to 30 chars.
  return /^[a-z0-9._]{1,64}$/.test(value) ? value : null;
}
