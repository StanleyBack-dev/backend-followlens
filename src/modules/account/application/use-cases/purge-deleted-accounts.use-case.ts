import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from "@/modules/users/application/ports/user-repository.port";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

export type PurgeOutcome = { purged: number };

// Called once a day by the Vercel cron: removes the accounts whose deletion
// grace period has ended, along with all their data.
@Injectable()
export class PurgeDeletedAccountsUseCase {
  private readonly logger = new Logger(PurgeDeletedAccountsUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(): Promise<PurgeOutcome> {
    const purged = await this.users.purgeDueForDeletion(this.clock.now());
    if (purged > 0) this.logger.log(`${purged} conta(s) excluída(s).`);
    return { purged };
  }
}
