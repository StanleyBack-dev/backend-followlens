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
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

export type ImportStatusView = {
  lastImport: ImportView | null;
  today: { used: number; limit: number; remaining: number };
};

@Injectable()
export class GetImportStatusUseCase {
  constructor(
    @Inject(IMPORT_REPOSITORY) private readonly imports: ImportRepositoryPort,
    @Inject(IMPORT_SETTINGS) private readonly settings: ImportSettings,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(userId: string): Promise<ImportStatusView> {
    const [lastImport, used] = await Promise.all([
      this.imports.findLatestCompleted(userId),
      this.imports.countCompletedOn(userId, this.clock.localDate()),
    ]);

    return {
      lastImport,
      today: {
        used,
        limit: this.settings.dailyLimit,
        remaining: Math.max(0, this.settings.dailyLimit - used),
      },
    };
  }
}
