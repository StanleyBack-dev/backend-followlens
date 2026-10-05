import { Inject, Injectable } from "@nestjs/common";
import {
  type Achievement,
  computeAchievements,
} from "@/modules/engagement/domain/achievements";
import {
  computeWeeklyStreak,
  type WeeklyStreak,
} from "@/modules/engagement/domain/weekly-streak";
import {
  IMPORT_REPOSITORY,
  type ImportRepositoryPort,
} from "@/modules/imports/application/ports/import-repository.port";
import { ReferralsService } from "@/modules/referrals/application/referrals.service";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

export type AchievementsView = {
  streak: WeeklyStreak;
  achievements: Achievement[];
};

// Everything here is derived from the import history on each request, so a
// deleted or re-imported profile never leaves a stale badge behind.
@Injectable()
export class GetAchievementsUseCase {
  constructor(
    @Inject(IMPORT_REPOSITORY) private readonly imports: ImportRepositoryPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly referrals: ReferralsService,
  ) {}

  async execute(userId: string, profileId: string): Promise<AchievementsView> {
    const [imports, referrals] = await Promise.all([
      this.imports.listCompleted(profileId),
      this.referrals.overview(userId),
    ]);
    const streak = computeWeeklyStreak(
      imports.map((item) => item.localDate),
      this.clock.localDate(),
    );
    return {
      streak,
      achievements: computeAchievements({
        imports,
        streak,
        paidReferrals: referrals.qualified,
      }),
    };
  }
}
