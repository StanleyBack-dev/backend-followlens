import { Inject, Injectable } from "@nestjs/common";
import type { AccountProfile } from "@/modules/account/application/account-profile";
import { GetAccountProfileUseCase } from "@/modules/account/application/use-cases/get-account-profile.use-case";
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from "@/modules/users/application/ports/user-repository.port";

@Injectable()
export class CancelAccountDeletionUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    private readonly getProfile: GetAccountProfileUseCase,
  ) {}

  async execute(userId: string): Promise<AccountProfile> {
    await this.users.cancelDeletion(userId);
    return this.getProfile.execute(userId);
  }
}
