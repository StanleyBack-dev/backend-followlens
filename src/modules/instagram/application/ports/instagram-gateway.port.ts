// Public contract of the Instagram integration (anti-corruption layer). It
// yields the same username-based shape the import file produces, so both
// feed the one follower list.

export type InstagramProfile = {
  userId: string;
  username: string;
  followerCount: number;
};

export type InstagramFollower = {
  username: string;
  followedAt: Date | null;
};

export type FollowersPage = {
  followers: InstagramFollower[];
  /** null when this was the last page. */
  nextCursor: string | null;
};

export interface InstagramGatewayPort {
  isConfigured(): boolean;
  /** Stable, non-reversible fingerprint of the configured session cookie. */
  sessionFingerprint(): string;
  /** Owner's numeric user id, known from the session (no request needed). */
  ownUserId(): string;
  getOwnProfile(): Promise<InstagramProfile>;
  fetchFollowersPage(params: {
    userId: string;
    cursor: string | null;
    pageSize: number;
  }): Promise<FollowersPage>;
}

export const INSTAGRAM_GATEWAY = Symbol("INSTAGRAM_GATEWAY");
