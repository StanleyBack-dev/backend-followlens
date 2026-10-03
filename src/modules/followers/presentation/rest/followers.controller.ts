import { Controller, Get, Query } from "@nestjs/common";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import type {
  FollowerEventView,
  FollowerView,
} from "@/modules/followers/application/ports/follower-repository.port";
import {
  type FollowersOverview,
  GetFollowersOverviewUseCase,
} from "@/modules/followers/application/use-cases/get-followers-overview.use-case";
import { ListFollowerEventsUseCase } from "@/modules/followers/application/use-cases/list-follower-events.use-case";
import {
  type FollowerFilterOptions,
  ListFollowerFilterOptionsUseCase,
} from "@/modules/followers/application/use-cases/list-follower-filter-options.use-case";
import { ListFollowersUseCase } from "@/modules/followers/application/use-cases/list-followers.use-case";
import {
  EventFilterOptionsQueryDto,
  FollowerFilterOptionsQueryDto,
  ListFollowerEventsQueryDto,
  ListFollowersQueryDto,
} from "@/modules/followers/presentation/rest/dtos/followers-query.dto";
import type { RequestUser } from "@/modules/auth/presentation/guards/user-session.guard";
import type { Paginated } from "@/shared/application/pagination";

@Controller("followers")
export class FollowersController {
  constructor(
    private readonly getOverview: GetFollowersOverviewUseCase,
    private readonly listFollowers: ListFollowersUseCase,
    private readonly listEvents: ListFollowerEventsUseCase,
    private readonly filterOptions: ListFollowerFilterOptionsUseCase,
  ) {}

  @Get("overview")
  overview(@CurrentUser() user: RequestUser): Promise<FollowersOverview> {
    return this.getOverview.execute(user.id);
  }

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query() query: ListFollowersQueryDto,
  ): Promise<Paginated<FollowerView>> {
    return this.listFollowers.execute(user.id, query);
  }

  @Get("filter-options")
  followerFilterOptions(
    @CurrentUser() user: RequestUser,
    @Query() query: FollowerFilterOptionsQueryDto,
  ): Promise<FollowerFilterOptions> {
    return this.filterOptions.forFollowers(user.id, query);
  }

  @Get("events")
  events(
    @CurrentUser() user: RequestUser,
    @Query() query: ListFollowerEventsQueryDto,
  ): Promise<Paginated<FollowerEventView>> {
    return this.listEvents.execute(user.id, query);
  }

  @Get("events/filter-options")
  eventFilterOptions(
    @CurrentUser() user: RequestUser,
    @Query() query: EventFilterOptionsQueryDto,
  ): Promise<FollowerFilterOptions> {
    return this.filterOptions.forEvents(user.id, query);
  }
}
