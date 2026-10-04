import { Inject, Injectable } from "@nestjs/common";
import {
  FOLLOWER_REPOSITORY,
  type FollowerFilterOption,
  type FollowerRepositoryPort,
} from "@/modules/followers/application/ports/follower-repository.port";
import type { FollowerEventType } from "@/modules/followers/domain/enums/follower-event-type.enum";
import type { FollowerStatus } from "@/modules/followers/domain/enums/follower-status.enum";

export const MAX_FILTER_OPTIONS = 2000;

export type FollowerFilterOptions = {
  options: FollowerFilterOption[];
  truncated: boolean;
};

export function normalizeOptionSearch(
  search: string | undefined,
): string | undefined {
  return search?.trim().replace(/^@+/, "").trim() || undefined;
}

@Injectable()
export class ListFollowerFilterOptionsUseCase {
  constructor(
    @Inject(FOLLOWER_REPOSITORY)
    private readonly followers: FollowerRepositoryPort,
  ) {}

  async forFollowers(
    profileId: string,
    criteria: { status?: FollowerStatus; search?: string } = {},
  ): Promise<FollowerFilterOptions> {
    return this.wrap(
      await this.followers.listFilterOptions(profileId, {
        status: criteria.status,
        search: normalizeOptionSearch(criteria.search),
        limit: MAX_FILTER_OPTIONS + 1,
      }),
    );
  }

  async forEvents(
    profileId: string,
    criteria: { type?: FollowerEventType; search?: string } = {},
  ): Promise<FollowerFilterOptions> {
    return this.wrap(
      await this.followers.listEventFilterOptions(profileId, {
        type: criteria.type,
        search: normalizeOptionSearch(criteria.search),
        limit: MAX_FILTER_OPTIONS + 1,
      }),
    );
  }

  private wrap(rows: FollowerFilterOption[]): FollowerFilterOptions {
    return {
      options: rows.slice(0, MAX_FILTER_OPTIONS),
      truncated: rows.length > MAX_FILTER_OPTIONS,
    };
  }
}
