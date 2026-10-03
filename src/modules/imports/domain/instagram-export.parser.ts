import { normalizeUsername } from "@/shared/domain/username";

export type ParsedFollower = {
  username: string;
  followedAt: Date | null;
};

export class ExportParseError extends Error {}

// Instagram's "followers_1.json" (and the combined file) store each follower
// as a string_list_data entry: { href, value (the @username), timestamp }.
// The file may be a bare array or wrapped under a key whose name contains
// "followers". We deliberately refuse a "following" file so a wrong upload
// doesn't wipe the list.
type StringListItem = { href?: string; value?: string; timestamp?: number };
type Connection = { string_list_data?: StringListItem[] };

function isFollowingOnly(root: Record<string, unknown>): boolean {
  const keys = Object.keys(root);
  return (
    keys.length > 0 &&
    keys.every((k) => /following/i.test(k) && !/follower/i.test(k))
  );
}

function pickConnectionsArray(parsed: unknown): Connection[] {
  if (Array.isArray(parsed)) return parsed as Connection[];

  if (parsed && typeof parsed === "object") {
    const root = parsed as Record<string, unknown>;
    if (isFollowingOnly(root)) {
      throw new ExportParseError(
        "O arquivo enviado parece ser de 'Seguindo', não de 'Seguidores'.",
      );
    }
    // Prefer a key that mentions followers; else the first array value.
    const followerKey = Object.keys(root).find(
      (k) => /follower/i.test(k) && Array.isArray(root[k]),
    );
    const chosen = followerKey
      ? root[followerKey]
      : Object.values(root).find((v) => Array.isArray(v));
    if (Array.isArray(chosen)) return chosen as Connection[];
  }

  throw new ExportParseError("Estrutura de arquivo não reconhecida.");
}

function toTimestamp(seconds: number | undefined): Date | null {
  if (!seconds || !Number.isFinite(seconds)) return null;
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Parses the JSON content of a followers export into unique followers. */
export function parseFollowersJson(content: string): ParsedFollower[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new ExportParseError("Arquivo JSON inválido.");
  }

  const connections = pickConnectionsArray(parsed);
  const byUsername = new Map<string, ParsedFollower>();

  for (const connection of connections) {
    const item = connection?.string_list_data?.[0];
    if (!item) continue;
    const username = normalizeUsername(item.value ?? item.href ?? "");
    if (!username) continue;
    // Keep the earliest "followed at" if the username repeats.
    const followedAt = toTimestamp(item.timestamp);
    const existing = byUsername.get(username);
    if (!existing) {
      byUsername.set(username, { username, followedAt });
    } else if (
      followedAt &&
      (!existing.followedAt || followedAt < existing.followedAt)
    ) {
      existing.followedAt = followedAt;
    }
  }

  return [...byUsername.values()];
}
