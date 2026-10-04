import { Inject, Injectable } from "@nestjs/common";
import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";
import {
  FOLLOWER_REPOSITORY,
  type FollowerRepositoryPort,
  type FollowerView,
  type ListFollowersFilters,
} from "@/modules/followers/application/ports/follower-repository.port";
import { assertKnownFilterUser } from "@/modules/followers/application/services/assert-known-filter-user";
import type { Paginated } from "@/shared/application/pagination";

@Injectable()
export class ListFollowersUseCase {
  constructor(
    @Inject(FOLLOWER_REPOSITORY)
    private readonly followers: FollowerRepositoryPort,
  ) {}

  async execute(
    viewer: { id: string; pro: boolean },
    filters: ListFollowersFilters,
  ): Promise<Paginated<FollowerView>> {
    const search = filters.search?.trim().replace(/^@/, "") || undefined;
    // Searching and filtering by follower are Pro features.
    if (!viewer.pro && (search || filters.username)) {
      throw AppException.from(APP_ERRORS.billing.proRequired, undefined);
    }
    await assertKnownFilterUser(this.followers, viewer.id, filters.username);
    return this.followers.list(viewer.id, { ...filters, search });
  }
}
