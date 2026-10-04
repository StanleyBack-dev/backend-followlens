import { Inject, Injectable } from "@nestjs/common";
import {
  IMPORT_REPOSITORY,
  type ImportRepositoryPort,
  type ImportView,
} from "@/modules/imports/application/ports/import-repository.port";
import {
  IMPORT_SETTINGS,
  type ImportSettings,
} from "@/modules/imports/application/imports.config";
import { nextFreeImportAt } from "@/modules/imports/application/use-cases/import-followers-export.use-case";
import {
  PLAN_LIMITS,
  type PlanLimits,
} from "@/shared/application/plan-limits.config";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

export type ImportStatusView = {
  lastImport: ImportView | null;
  today: { used: number; limit: number; remaining: number };
  /** Free plan wait between imports; `nextAllowedAt` is null when none applies. */
  freeInterval: { days: number; nextAllowedAt: Date | null } | null;
};

@Injectable()
export class GetImportStatusUseCase {
  constructor(
    @Inject(IMPORT_REPOSITORY) private readonly imports: ImportRepositoryPort,
    @Inject(IMPORT_SETTINGS) private readonly settings: ImportSettings,
    @Inject(CLOCK) private readonly clock: ClockPort,
    @Inject(PLAN_LIMITS) private readonly planLimits: PlanLimits,
  ) {}

  async execute(profile: {
    id: string;
    pro: boolean;
  }): Promise<ImportStatusView> {
    const profileId = profile.id;
    const [lastImport, used, lastComparisonAt] = await Promise.all([
      this.imports.findLatestCompleted(profileId),
      this.imports.countCompletedOn(profileId, this.clock.localDate()),
      profile.pro ? null : this.imports.findLastComparisonAt(profileId),
    ]);
    const days = this.planLimits.freeImportIntervalDays;

    return {
      lastImport,
      today: {
        used,
        limit: this.settings.dailyLimit,
        remaining: Math.max(0, this.settings.dailyLimit - used),
      },
      freeInterval: profile.pro
        ? null
        : {
            days,
            nextAllowedAt: nextFreeImportAt(
              lastComparisonAt,
              days,
              this.clock.now(),
            ),
          },
    };
  }
}
