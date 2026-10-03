import { Inject, Injectable } from "@nestjs/common";
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
    userId: string,
    filters: ListFollowersFilters,
  ): Promise<Paginated<FollowerView>> {
    await assertKnownFilterUser(this.followers, userId, filters.username);
    return this.followers.list(userId, {
      ...filters,
      search: filters.search?.trim().replace(/^@/, "") || undefined,
    });
  }
}
