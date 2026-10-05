import { Controller, Get, Headers, Query } from "@nestjs/common";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import type { RequestUser } from "@/modules/auth/presentation/guards/user-session.guard";
import {
  type AchievementsView,
  GetAchievementsUseCase,
} from "@/modules/engagement/application/use-cases/get-achievements.use-case";
import {
  GetMonthlySummaryUseCase,
  type MonthlySummary,
} from "@/modules/engagement/application/use-cases/get-monthly-summary.use-case";
import { ProfileAccessService } from "@/modules/profiles/application/profile-access.service";
import {
  PROFILE_HEADER,
  profileOwnerOf,
} from "@/modules/profiles/presentation/rest/active-profile";

// Achievements, streak and the monthly summary of the selected profile.
@Controller("engagement")
export class EngagementController {
  constructor(
    private readonly getAchievements: GetAchievementsUseCase,
    private readonly getSummary: GetMonthlySummaryUseCase,
    private readonly profiles: ProfileAccessService,
  ) {}

  @Get("achievements")
  async achievements(
    @CurrentUser() user: RequestUser,
    @Headers(PROFILE_HEADER) profileId?: string,
  ): Promise<AchievementsView> {
    return this.getAchievements.execute(
      user.id,
      await this.profileOf(user, profileId),
    );
  }

  @Get("summary")
  async summary(
    @CurrentUser() user: RequestUser,
    @Query("month") month?: string,
    @Headers(PROFILE_HEADER) profileId?: string,
  ): Promise<MonthlySummary> {
    return this.getSummary.execute(
      await this.profileOf(user, profileId),
      month,
    );
  }

  private async profileOf(
    user: RequestUser,
    selectedId: string | undefined,
  ): Promise<string> {
    return (await this.profiles.resolve(profileOwnerOf(user), selectedId)).id;
  }
}
