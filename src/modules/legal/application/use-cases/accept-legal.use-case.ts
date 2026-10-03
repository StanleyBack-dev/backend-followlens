import { Inject, Injectable } from "@nestjs/common";
import { CURRENT_LEGAL_VERSION } from "@/modules/legal/domain/legal-version.constant";
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from "@/modules/users/application/ports/user-repository.port";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

@Injectable()
export class AcceptLegalUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(
    userId: string,
  ): Promise<{ version: string; acceptedAt: string }> {
    const now = this.clock.now();
    await this.users.acceptTerms(userId, CURRENT_LEGAL_VERSION, now);
    return { version: CURRENT_LEGAL_VERSION, acceptedAt: now.toISOString() };
  }
}
