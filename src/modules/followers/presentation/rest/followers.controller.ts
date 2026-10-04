import { Controller, Get, Headers, Query } from "@nestjs/common";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";
import type { FollowerView } from "@/modules/followers/application/ports/follower-repository.port";
import {
  type FollowersOverview,
  GetFollowersOverviewUseCase,
} from "@/modules/followers/application/use-cases/get-followers-overview.use-case";
import {
  type FollowerEventsPage,
  ListFollowerEventsUseCase,
} from "@/modules/followers/application/use-cases/list-follower-events.use-case";
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
import { ProfileAccessService } from "@/modules/profiles/application/profile-access.service";
import {
  PROFILE_HEADER,
  profileOwnerOf,
} from "@/modules/profiles/presentation/rest/active-profile";
import { hasProAccess } from "@/modules/users/domain/plan-access";
import type { Paginated } from "@/shared/application/pagination";

@Controller("followers")
export class FollowersController {
  constructor(
    private readonly getOverview: GetFollowersOverviewUseCase,
    private readonly listFollowers: ListFollowersUseCase,
    private readonly listEvents: ListFollowerEventsUseCase,
    private readonly filterOptions: ListFollowerFilterOptionsUseCase,
    private readonly profiles: ProfileAccessService,
  ) {}

  @Get("overview")
  async overview(
    @CurrentUser() user: RequestUser,
    @Headers(PROFILE_HEADER) profileId?: string,
  ): Promise<FollowersOverview> {
    return this.getOverview.execute(await this.profileOf(user, profileId));
  }

  @Get()
  async list(
    @CurrentUser() user: RequestUser,
    @Query() query: ListFollowersQueryDto,
    @Headers(PROFILE_HEADER) profileId?: string,
  ): Promise<Paginated<FollowerView>> {
    return this.listFollowers.execute(
      await this.viewerOf(user, profileId),
      query,
    );
  }

  @Get("filter-options")
  async followerFilterOptions(
    @CurrentUser() user: RequestUser,
    @Query() query: FollowerFilterOptionsQueryDto,
    @Headers(PROFILE_HEADER) profileId?: string,
  ): Promise<FollowerFilterOptions> {
    assertPro(user);
    return this.filterOptions.forFollowers(
      await this.profileOf(user, profileId),
      query,
    );
  }

  @Get("events")
  async events(
    @CurrentUser() user: RequestUser,
    @Query() query: ListFollowerEventsQueryDto,
    @Headers(PROFILE_HEADER) profileId?: string,
  ): Promise<FollowerEventsPage> {
    return this.listEvents.execute(await this.viewerOf(user, profileId), query);
  }

  @Get("events/filter-options")
  async eventFilterOptions(
    @CurrentUser() user: RequestUser,
    @Query() query: EventFilterOptionsQueryDto,
    @Headers(PROFILE_HEADER) profileId?: string,
  ): Promise<FollowerFilterOptions> {
    assertPro(user);
    return this.filterOptions.forEvents(
      await this.profileOf(user, profileId),
      query,
    );
  }

  /** Id of the profile this request acts on (the selected one, or the default). */
  private async profileOf(
    user: RequestUser,
    selectedId: string | undefined,
  ): Promise<string> {
    return (await this.profiles.resolve(profileOwnerOf(user), selectedId)).id;
  }

  private async viewerOf(
    user: RequestUser,
    selectedId: string | undefined,
  ): Promise<{ id: string; pro: boolean }> {
    return {
      id: await this.profileOf(user, selectedId),
      pro: hasProAccess(user),
    };
  }
}

// The "filter by follower" combobox only exists on Pro.
function assertPro(user: RequestUser): void {
  if (!hasProAccess(user)) {
    throw AppException.from(APP_ERRORS.billing.proRequired, undefined);
  }
}
