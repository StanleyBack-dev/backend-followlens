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
  lastLoginAt: Date | null;
  createdAt: Date;
  deletionRequestedAt: Date | null;
  deletionScheduledFor: Date | null;
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
  /** Users whose plan is Pro (paid or granted by an admin). */
  pro: number;
  activeLast30Days: number;
};

export interface UserRepositoryPort {
  findById(id: string): Promise<UserView | null>;
  findByEmail(email: string): Promise<UserView | null>;
  /** Unknown or malformed ids are simply left out. */
  findByIds(ids: string[]): Promise<UserView[]>;
  /**
   * Creates the user on first sign-in, or refreshes picture + last login. The
   * name is only taken from Google on creation (the user can edit it later).
   * `created` is true only when this sign-in created the account.
   */
  upsertFromGoogle(
    input: UpsertGoogleUserInput,
    now: Date,
  ): Promise<{ user: UserView; created: boolean }>;
  acceptTerms(userId: string, version: string, at: Date): Promise<void>;

  // === account (self-service) ===
  updateName(userId: string, name: string): Promise<void>;
  scheduleDeletion(
    userId: string,
    requestedAt: Date,
    scheduledFor: Date,
  ): Promise<void>;
  cancelDeletion(userId: string): Promise<void>;
  /** Removes every account whose grace period ended; returns how many. */
  purgeDueForDeletion(now: Date): Promise<number>;

  // === admin ===
  list(filters: ListUsersFilters): Promise<Paginated<AdminUserView>>;
  counts(activeSince: Date): Promise<UserCounts>;
  updateAccess(
    userId: string,
    changes: { role?: UserRole; plan?: UserPlan },
  ): Promise<AdminUserView | null>;
}

export const USER_REPOSITORY = Symbol("USER_REPOSITORY");
