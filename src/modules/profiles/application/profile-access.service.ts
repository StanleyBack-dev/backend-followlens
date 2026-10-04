import { Inject, Injectable } from "@nestjs/common";
import {
  PROFILE_REPOSITORY,
  type ProfileRepositoryPort,
  type ProfileView,
} from "@/modules/profiles/application/ports/profile-repository.port";
import {
  PLAN_LIMITS,
  type PlanLimits,
} from "@/shared/application/plan-limits.config";

export const DEFAULT_PROFILE_NAME = "Perfil principal";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ProfileOwner = { id: string; pro: boolean };

export type UserProfile = ProfileView & {
  /** Over the plan's limit (after a downgrade): kept, but not usable. */
  locked: boolean;
};

export type UserProfiles = {
  profiles: UserProfile[];
  /** How many profiles the user's plan allows. */
  limit: number;
};

// Which profiles a user has and may use. Everything that reads or writes
// follower data goes through `resolve` to get the profile it acts on.
@Injectable()
export class ProfileAccessService {
  constructor(
    @Inject(PROFILE_REPOSITORY)
    private readonly profiles: ProfileRepositoryPort,
    @Inject(PLAN_LIMITS) private readonly limits: PlanLimits,
  ) {}

  limitFor(owner: ProfileOwner): number {
    return owner.pro ? this.limits.proProfiles : this.limits.freeProfiles;
  }

  async list(owner: ProfileOwner): Promise<UserProfiles> {
    let rows = await this.profiles.listByUser(owner.id);
    if (rows.length === 0) {
      await this.profiles.ensureDefault(owner.id, DEFAULT_PROFILE_NAME);
      rows = await this.profiles.listByUser(owner.id);
    }
    // Default first, then oldest: after a downgrade the newest ones lock.
    const limit = this.limitFor(owner);
    return {
      profiles: rows.map((row, index) => ({ ...row, locked: index >= limit })),
      limit,
    };
  }

  /**
   * The profile a request acts on: the requested one when it is the user's
   * and usable, otherwise the default. Never fails on a stale selection.
   */
  async resolve(
    owner: ProfileOwner,
    requestedId: string | undefined,
  ): Promise<UserProfile> {
    const { profiles } = await this.list(owner);
    const requested =
      requestedId && UUID.test(requestedId)
        ? profiles.find((profile) => profile.id === requestedId)
        : undefined;
    return requested && !requested.locked ? requested : profiles[0];
  }

  /** The default profile of a user (e.g. where the owner's sync writes). */
  async defaultOf(userId: string): Promise<UserProfile> {
    return (await this.list({ id: userId, pro: false })).profiles[0];
  }
}
