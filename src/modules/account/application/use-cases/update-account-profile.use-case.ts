import { Inject, Injectable } from "@nestjs/common";
import type { AccountProfile } from "@/modules/account/application/account-profile";
import { GetAccountProfileUseCase } from "@/modules/account/application/use-cases/get-account-profile.use-case";
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from "@/modules/users/application/ports/user-repository.port";

export type UpdateAccountProfileCommand = {
  name: string;
};

// Only the display name is editable: e-mail and picture come from Google.
@Injectable()
export class UpdateAccountProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    private readonly getProfile: GetAccountProfileUseCase,
  ) {}

  async execute(
    userId: string,
    command: UpdateAccountProfileCommand,
  ): Promise<AccountProfile> {
    await this.users.updateName(userId, command.name.trim());
    return this.getProfile.execute(userId);
  }
}
