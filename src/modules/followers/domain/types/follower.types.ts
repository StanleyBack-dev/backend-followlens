import type { FollowerStatus } from "@/modules/followers/domain/enums/follower-status.enum";

// The official "Export your information" file gives only the @username and the
// date the person started following — no numeric id, photo, name or flags. So
// the normalized username is the stable key here. A consequence: when someone
// renames their account it shows up as the old @ lost + the new @ gained.

/** One follower as read from an export snapshot. */
export type FollowerSnapshotEntry = {
  username: string;
  /** When the person started following, if the file provides it. */
  followedAt: Date | null;
};

/** A follower we already know about from previous imports. */
export type KnownFollower = {
  username: string;
  status: FollowerStatus;
};
