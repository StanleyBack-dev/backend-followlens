import { Inject, Injectable } from "@nestjs/common";
import {
  FOLLOWER_REPOSITORY,
  type FollowerEventView,
  type FollowerRepositoryPort,
  type ListFollowerEventsFilters,
} from "@/modules/followers/application/ports/follower-repository.port";
import { assertKnownFilterUser } from "@/modules/followers/application/services/assert-known-filter-user";
import type { Paginated } from "@/shared/application/pagination";

@Injectable()
export class ListFollowerEventsUseCase {
  constructor(
    @Inject(FOLLOWER_REPOSITORY)
    private readonly followers: FollowerRepositoryPort,
  ) {}

  async execute(
    userId: string,
    filters: ListFollowerEventsFilters,
  ): Promise<Paginated<FollowerEventView>> {
    await assertKnownFilterUser(this.followers, userId, filters.username);
    return this.followers.listEvents(userId, filters);
  }
}
