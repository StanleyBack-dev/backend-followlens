import { Inject, Injectable } from "@nestjs/common";
import {
  USER_REPOSITORY,
  type UserCounts,
  type UserRepositoryPort,
} from "@/modules/users/application/ports/user-repository.port";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class GetAdminOverviewUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  execute(): Promise<UserCounts> {
    return this.users.counts(
      new Date(this.clock.now().getTime() - 30 * DAY_MS),
    );
  }
}
