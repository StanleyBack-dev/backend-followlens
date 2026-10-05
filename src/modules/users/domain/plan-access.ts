import { UserPlan } from "@/modules/users/domain/enums/user-plan.enum";

export type PlanHolder = {
  plan: string;
  isAdmin: boolean;
  /** A time-limited Pro (referral reward) that has not run out yet. */
  proBonusActive?: boolean;
};

// Admins run the system and are never bound by plan limits; everyone else
// needs Pro: a paid subscription, a grant by an admin, or an active bonus.
export function hasProAccess(user: PlanHolder): boolean {
  return (
    user.isAdmin ||
    user.plan === (UserPlan.PRO as string) ||
    user.proBonusActive === true
  );
}

export function isBonusActive(until: Date | null, now: Date): boolean {
  return until !== null && until > now;
}
