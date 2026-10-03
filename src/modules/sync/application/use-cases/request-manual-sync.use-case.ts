import { Injectable } from "@nestjs/common";
import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";
import type { SyncRunView } from "@/modules/sync/application/ports/sync-run-repository.port";
import {
  SyncCoordinatorService,
  type SyncSkipReason,
} from "@/modules/sync/application/services/sync-coordinator.service";
import { SyncTrigger } from "@/modules/sync/domain/enums/sync-trigger.enum";

const SKIP_ERRORS: Record<
  SyncSkipReason,
  (typeof APP_ERRORS.sync)[keyof typeof APP_ERRORS.sync]
> = {
  "not-configured": APP_ERRORS.sync.notConfigured,
  "integration-blocked": APP_ERRORS.sync.integrationBlocked,
  "already-running": APP_ERRORS.sync.alreadyRunning,
  "manual-daily-limit": APP_ERRORS.sync.manualDailyLimitReached,
  "already-synced-today": APP_ERRORS.sync.alreadySyncedToday,
  "min-interval": APP_ERRORS.sync.minIntervalNotElapsed,
};

export type ManualSyncResult = { resumed: boolean; run: SyncRunView };

@Injectable()
export class RequestManualSyncUseCase {
  constructor(private readonly coordinator: SyncCoordinatorService) {}

  async execute(): Promise<ManualSyncResult> {
    const result = await this.coordinator.run(SyncTrigger.MANUAL);
    if (result.outcome === "skipped") {
      throw AppException.from(SKIP_ERRORS[result.reason], undefined, {
        reason: result.reason,
        nextAllowedAt: result.nextAllowedAt?.toISOString() ?? null,
      });
    }
    return { resumed: result.resumed, run: result.run };
  }
}
