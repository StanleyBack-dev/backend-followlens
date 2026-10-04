import type { UserView } from "@/modules/users/application/ports/user-repository.port";
import type { UserPlan } from "@/modules/users/domain/enums/user-plan.enum";
import { UserRole } from "@/modules/users/domain/enums/user-role.enum";

export type AccountDeletion = {
  requestedAt: Date;
  scheduledFor: Date;
};

/** What the signed-in user sees about their own account. */
export type AccountProfile = {
  id: string;
  email: string;
  name: string;
  pictureUrl: string | null;
  plan: UserPlan;
  role: UserRole;
  isAdmin: boolean;
  isMaster: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
  /** Pending deletion, or null when the account is not scheduled for it. */
  deletion: AccountDeletion | null;
  deletionGraceDays: number;
};

export function toAccountProfile(
  user: UserView,
  context: { isMaster: boolean; deletionGraceDays: number },
): AccountProfile {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    pictureUrl: user.pictureUrl,
    plan: user.plan,
    role: user.role,
    isAdmin: user.role === UserRole.ADMIN,
    isMaster: context.isMaster,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    deletion:
      user.deletionRequestedAt && user.deletionScheduledFor
        ? {
            requestedAt: user.deletionRequestedAt,
            scheduledFor: user.deletionScheduledFor,
          }
        : null,
    deletionGraceDays: context.deletionGraceDays,
  };
}
