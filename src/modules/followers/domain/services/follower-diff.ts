import { FollowerStatus } from "@/modules/followers/domain/enums/follower-status.enum";
import type {
  FollowerSnapshotEntry,
  KnownFollower,
} from "@/modules/followers/domain/types/follower.types";

export type FollowerDiff = {
  /** Distinct followers present in the current snapshot. */
  current: FollowerSnapshotEntry[];
  lost: KnownFollower[];
  gained: FollowerSnapshotEntry[];
  returned: FollowerSnapshotEntry[];
};

// Compares by normalized @username (the only stable key the export gives).
export function computeFollowerDiff(
  known: KnownFollower[],
  snapshot: FollowerSnapshotEntry[],
): FollowerDiff {
  const current = dedupeByUsername(snapshot);
  const currentUsernames = new Set(current.map((entry) => entry.username));
  const knownByUsername = new Map(known.map((f) => [f.username, f]));

  const lost = known.filter(
    (follower) =>
      follower.status === FollowerStatus.ACTIVE &&
      !currentUsernames.has(follower.username),
  );

  const gained: FollowerSnapshotEntry[] = [];
  const returned: FollowerSnapshotEntry[] = [];
  for (const entry of current) {
    const previous = knownByUsername.get(entry.username);
    if (!previous) {
      gained.push(entry);
    } else if (previous.status === FollowerStatus.LOST) {
      returned.push(entry);
    }
  }

  return { current, lost, gained, returned };
}

// The same @ can appear twice in a malformed/merged export.
function dedupeByUsername(
  entries: FollowerSnapshotEntry[],
): FollowerSnapshotEntry[] {
  const byUsername = new Map<string, FollowerSnapshotEntry>();
  for (const entry of entries) {
    byUsername.set(entry.username, entry);
  }
  return [...byUsername.values()];
}
