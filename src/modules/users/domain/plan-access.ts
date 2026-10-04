import { UserPlan } from "@/modules/users/domain/enums/user-plan.enum";

export type PlanHolder = { plan: string; isAdmin: boolean };

// Admins run the system and are never bound by plan limits; everyone else
// needs the Pro plan (paid subscription or granted by an admin).
export function hasProAccess(user: PlanHolder): boolean {
  return user.isAdmin || user.plan === (UserPlan.PRO as string);
}
