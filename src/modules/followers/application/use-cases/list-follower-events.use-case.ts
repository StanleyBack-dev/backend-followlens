import { Inject, Injectable } from "@nestjs/common";
import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";
import {
  FOLLOWER_REPOSITORY,
  type FollowerEventView,
  type FollowerRepositoryPort,
  type ListFollowerEventsFilters,
} from "@/modules/followers/application/ports/follower-repository.port";
import { assertKnownFilterUser } from "@/modules/followers/application/services/assert-known-filter-user";
import { FollowerEventType } from "@/modules/followers/domain/enums/follower-event-type.enum";
import { paginate, type Paginated } from "@/shared/application/pagination";
import {
  PLAN_LIMITS,
  type PlanLimits,
} from "@/shared/application/plan-limits.config";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

const DAY_MS = 86_400_000;

export type FollowerEventsPage = Paginated<FollowerEventView> & {
  /** Events that exist but are hidden by the Free plan (0 on Pro). */
  locked: number;
};

@Injectable()
export class ListFollowerEventsUseCase {
  constructor(
    @Inject(FOLLOWER_REPOSITORY)
    private readonly followers: FollowerRepositoryPort,
    @Inject(PLAN_LIMITS) private readonly planLimits: PlanLimits,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(
    viewer: { id: string; pro: boolean },
    filters: ListFollowerEventsFilters,
  ): Promise<FollowerEventsPage> {
    if (viewer.pro) {
      await assertKnownFilterUser(this.followers, viewer.id, filters.username);
      return {
        ...(await this.followers.listEvents(viewer.id, filters)),
        locked: 0,
      };
    }
    return this.executeFree(viewer.id, filters);
  }

  // Free: only the names of who unfollowed, and only inside the recent
  // window. Everything else is counted, so the UI can say how much is locked.
  private async executeFree(
    profileId: string,
    filters: ListFollowerEventsFilters,
  ): Promise<FollowerEventsPage> {
    if (filters.username) {
      throw AppException.from(APP_ERRORS.billing.proRequired, undefined);
    }

    const existing = await this.followers.countEvents(profileId, filters.type);
    if (filters.type && filters.type !== FollowerEventType.LOST) {
      return { ...paginate([], 0, filters), locked: existing };
    }

    const page = await this.followers.listEvents(profileId, {
      page: filters.page,
      limit: filters.limit,
      type: FollowerEventType.LOST,
      since: new Date(
        this.clock.now().getTime() - this.planLimits.freeHistoryDays * DAY_MS,
      ),
    });
    return { ...page, locked: Math.max(0, existing - page.total) };
  }
}
