import type { UserPlan } from "@/modules/users/domain/enums/user-plan.enum";
import type { UserRole } from "@/modules/users/domain/enums/user-role.enum";
import type { PageRequest, Paginated } from "@/shared/application/pagination";

export type UserView = {
  id: string;
  googleId: string;
  email: string;
  name: string;
  pictureUrl: string | null;
  plan: UserPlan;
  role: UserRole;
  termsVersion: string | null;
  termsAcceptedAt: Date | null;
};

/** Admin listing row (includes activity timestamps). */
export type AdminUserView = {
  id: string;
  email: string;
  name: string;
  pictureUrl: string | null;
  plan: UserPlan;
  role: UserRole;
  termsAccepted: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
};

export type UpsertGoogleUserInput = {
  googleId: string;
  email: string;
  name: string;
  pictureUrl: string | null;
  /** Role to force on login (e.g. the master admin from env). */
  forcedRole?: UserRole;
};

export type ListUsersFilters = PageRequest & {
  search?: string;
  role?: UserRole;
};

export type UserCounts = {
  total: number;
  admins: number;
  activeLast30Days: number;
};

export interface UserRepositoryPort {
  findById(id: string): Promise<UserView | null>;
  findByEmail(email: string): Promise<UserView | null>;
  /** Creates the user on first sign-in, or updates profile + last login. */
  /** `created` is true only when this sign-in created the account. */
  upsertFromGoogle(
    input: UpsertGoogleUserInput,
    now: Date,
  ): Promise<{ user: UserView; created: boolean }>;
  acceptTerms(userId: string, version: string, at: Date): Promise<void>;

  // === admin ===
  list(filters: ListUsersFilters): Promise<Paginated<AdminUserView>>;
  counts(activeSince: Date): Promise<UserCounts>;
  updateAccess(
    userId: string,
    changes: { role?: UserRole; plan?: UserPlan },
  ): Promise<AdminUserView | null>;
}

export const USER_REPOSITORY = Symbol("USER_REPOSITORY");
