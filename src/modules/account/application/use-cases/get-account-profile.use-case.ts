import { Inject, Injectable } from "@nestjs/common";
import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";
import {
  type AccountProfile,
  toAccountProfile,
} from "@/modules/account/application/account-profile";
import {
  ACCOUNT_SETTINGS,
  type AccountSettings,
} from "@/modules/account/application/account.config";
import { AdminPolicyService } from "@/modules/users/application/admin-policy.service";
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from "@/modules/users/application/ports/user-repository.port";

@Injectable()
export class GetAccountProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(ACCOUNT_SETTINGS) private readonly settings: AccountSettings,
    private readonly adminPolicy: AdminPolicyService,
  ) {}

  async execute(userId: string): Promise<AccountProfile> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw AppException.from(APP_ERRORS.auth.userNotFound, undefined);
    }
    return toAccountProfile(user, {
      isMaster: this.adminPolicy.isMaster(user.email),
      deletionGraceDays: this.settings.deletionGraceDays,
    });
  }
}
