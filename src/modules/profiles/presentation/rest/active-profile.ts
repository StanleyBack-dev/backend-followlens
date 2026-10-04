import type { RequestUser } from "@/modules/auth/presentation/guards/user-session.guard";
import type { ProfileOwner } from "@/modules/profiles/application/profile-access.service";
import { hasProAccess } from "@/modules/users/domain/plan-access";

/** Header the BFF sends with the profile selected in the UI. */
export const PROFILE_HEADER = "x-profile-id";

export function profileOwnerOf(user: RequestUser): ProfileOwner {
  return { id: user.id, pro: hasProAccess(user) };
}
