import { Inject, Injectable } from "@nestjs/common";
import {
  type AdminUserView,
  type ListUsersFilters,
  USER_REPOSITORY,
  type UserRepositoryPort,
} from "@/modules/users/application/ports/user-repository.port";
import { AdminPolicyService } from "@/modules/users/application/admin-policy.service";
import type { Paginated } from "@/shared/application/pagination";

export type AdminUserRow = AdminUserView & { isMaster: boolean };

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    private readonly adminPolicy: AdminPolicyService,
  ) {}

  async execute(filters: ListUsersFilters): Promise<Paginated<AdminUserRow>> {
    const page = await this.users.list({
      ...filters,
      search: filters.search?.trim() || undefined,
    });
    return {
      ...page,
      items: page.items.map((user) => ({
        ...user,
        isMaster: this.adminPolicy.isMaster(user.email),
      })),
    };
  }
}
