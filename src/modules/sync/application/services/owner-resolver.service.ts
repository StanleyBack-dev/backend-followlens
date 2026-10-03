import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from "@/modules/users/application/ports/user-repository.port";

export type SyncOwner = { userId: string; email: string };

// The session-based sync writes to a single owner's follower list — the user
// whose email matches OWNER_EMAIL. The owner must have signed in with Google
// at least once (so the user row exists). In a pure public deploy OWNER_EMAIL
// is unset and sync stays unavailable.
@Injectable()
export class OwnerResolverService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    private readonly config: ConfigService,
  ) {}

  async resolve(): Promise<SyncOwner | null> {
    const email = (this.config.get<string>("OWNER_EMAIL") ?? "")
      .trim()
      .toLowerCase();
    if (!email) return null;
    const user = await this.users.findByEmail(email);
    return user ? { userId: user.id, email: user.email } : null;
  }
}
