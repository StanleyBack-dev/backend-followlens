import { Inject, Injectable } from "@nestjs/common";
import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";
import { AdminPolicyService } from "@/modules/users/application/admin-policy.service";
import {
  type AdminUserView,
  USER_REPOSITORY,
  type UserRepositoryPort,
} from "@/modules/users/application/ports/user-repository.port";
import type { UserPlan } from "@/modules/users/domain/enums/user-plan.enum";
import type { UserRole } from "@/modules/users/domain/enums/user-role.enum";

export type UpdateUserAccessCommand = {
  role?: UserRole;
  plan?: UserPlan;
};

export type AdminUserRow = AdminUserView & { isMaster: boolean };

@Injectable()
export class UpdateUserAccessUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    private readonly adminPolicy: AdminPolicyService,
  ) {}

  async execute(
    targetUserId: string,
    changes: UpdateUserAccessCommand,
  ): Promise<AdminUserRow> {
    const target = await this.users.findById(targetUserId);
    if (!target) {
      throw AppException.from(APP_ERRORS.auth.userNotFound, undefined);
    }
    // The master admin is defined by configuration and cannot be demoted here.
    if (changes.role && this.adminPolicy.isMaster(target.email)) {
      throw AppException.from(APP_ERRORS.auth.cannotChangeMaster, undefined);
    }

    const updated = await this.users.updateAccess(targetUserId, changes);
    if (!updated) {
      throw AppException.from(APP_ERRORS.auth.userNotFound, undefined);
    }
    return { ...updated, isMaster: this.adminPolicy.isMaster(updated.email) };
  }
}
