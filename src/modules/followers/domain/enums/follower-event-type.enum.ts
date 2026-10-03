export enum FollowerEventType {
  /** Stopped following (was active in the previous snapshot). */
  LOST = "lost",
  /** First time ever seen following. */
  GAINED = "gained",
  /** Had unfollowed before and is following again. */
  RETURNED = "returned",
}
