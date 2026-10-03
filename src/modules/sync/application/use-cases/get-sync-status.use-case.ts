import { Inject, Injectable } from "@nestjs/common";
import {
  SYNC_RUN_REPOSITORY,
  type SyncRunRepositoryPort,
  type SyncRunView,
} from "@/modules/sync/application/ports/sync-run-repository.port";
import {
  IntegrationGuardService,
  type IntegrationStatus,
} from "@/modules/sync/application/services/integration-guard.service";
import { SyncCoordinatorService } from "@/modules/sync/application/services/sync-coordinator.service";
import { OwnerResolverService } from "@/modules/sync/application/services/owner-resolver.service";
import {
  SYNC_SETTINGS,
  type SyncSettings,
} from "@/modules/sync/application/sync.config";
import { SyncTrigger } from "@/modules/sync/domain/enums/sync-trigger.enum";

export type SyncStatus = {
  integration: IntegrationStatus;
  currentRun: SyncRunView | null;
  lastCompletedRun: SyncRunView | null;
  manualSync: {
    available: boolean;
    willResume: boolean;
    reason: string | null;
    nextAllowedAt: Date | null;
  };
  limits: { manualDailyLimit: number; minIntervalMinutes: number };
};

@Injectable()
export class GetSyncStatusUseCase {
  constructor(
    @Inject(SYNC_RUN_REPOSITORY) private readonly runs: SyncRunRepositoryPort,
    @Inject(SYNC_SETTINGS) private readonly settings: SyncSettings,
    private readonly integration: IntegrationGuardService,
    private readonly coordinator: SyncCoordinatorService,
    private readonly ownerResolver: OwnerResolverService,
  ) {}

  async execute(): Promise<SyncStatus> {
    const [integrationRaw, owner, unfinished, lastCompletedRun, verdict] =
      await Promise.all([
        this.integration.status(),
        this.ownerResolver.resolve(),
        this.runs.findUnfinished(),
        this.runs.findLatestCompleted(),
        this.coordinator.preview(SyncTrigger.MANUAL),
      ]);

    // Without an owner user, the session mode is effectively not configured.
    const integration = owner
      ? integrationRaw
      : { ...integrationRaw, configured: false };
    const integrationOk = integration.configured && !integration.blocked;
    const willResume = unfinished !== null;
    const available = integrationOk && (willResume || verdict.allowed);

    return {
      integration,
      currentRun: unfinished?.toPrimitive() ?? null,
      lastCompletedRun,
      manualSync: {
        available,
        willResume,
        reason: !integrationOk
          ? integration.configured
            ? "integration-blocked"
            : "not-configured"
          : !available && !verdict.allowed
            ? verdict.reason
            : null,
        nextAllowedAt:
          !available && !verdict.allowed ? verdict.nextAllowedAt : null,
      },
      limits: {
        manualDailyLimit: this.settings.manualDailyLimit,
        minIntervalMinutes: this.settings.minIntervalMinutes,
      },
    };
  }
}
