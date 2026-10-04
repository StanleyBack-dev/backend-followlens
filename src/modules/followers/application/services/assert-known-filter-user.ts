import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";
import type { FollowerRepositoryPort } from "@/modules/followers/application/ports/follower-repository.port";

// A "filter by follower" value must point to an account we actually track for
// this user; anything else (tampered URL, stale link) is rejected.
export async function assertKnownFilterUser(
  followers: FollowerRepositoryPort,
  profileId: string,
  username: string | undefined,
): Promise<void> {
  if (username && !(await followers.existsByUsername(profileId, username))) {
    throw AppException.from(APP_ERRORS.followers.unknownFilterUser, undefined);
  }
}
