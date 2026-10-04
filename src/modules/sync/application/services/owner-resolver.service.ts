import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ProfileAccessService } from "@/modules/profiles/application/profile-access.service";
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from "@/modules/users/application/ports/user-repository.port";

export type SyncOwner = {
  userId: string;
  email: string;
  /** The owner's default profile: where the synced list is written. */
  profileId: string;
};

// The session-based sync writes to a single owner's follower list — the
// default profile of the user whose email matches OWNER_EMAIL. The owner must have signed in with Google
// at least once (so the user row exists). In a pure public deploy OWNER_EMAIL
// is unset and sync stays unavailable.
@Injectable()
export class OwnerResolverService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    private readonly config: ConfigService,
    private readonly profiles: ProfileAccessService,
  ) {}

  async resolve(): Promise<SyncOwner | null> {
    const email = (this.config.get<string>("OWNER_EMAIL") ?? "")
      .trim()
      .toLowerCase();
    if (!email) return null;
    const user = await this.users.findByEmail(email);
    if (!user) return null;
    const profile = await this.profiles.defaultOf(user.id);
    return { userId: user.id, email: user.email, profileId: profile.id };
  }
}
