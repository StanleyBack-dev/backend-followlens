import { randomUUID } from "crypto";
import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  SYNC_RUN_REPOSITORY,
  type SyncRunRepositoryPort,
  type SyncRunView,
} from "@/modules/sync/application/ports/sync-run-repository.port";
import { IntegrationGuardService } from "@/modules/sync/application/services/integration-guard.service";
import { SyncEngineService } from "@/modules/sync/application/services/sync-engine.service";
import { OwnerResolverService } from "@/modules/sync/application/services/owner-resolver.service";
import {
  SYNC_SETTINGS,
  type SyncSettings,
} from "@/modules/sync/application/sync.config";
import { SyncRun } from "@/modules/sync/domain/entities/sync-run";
import type { SyncTrigger } from "@/modules/sync/domain/enums/sync-trigger.enum";
import {
  type SyncDenialReason,
  SyncTriggerPolicy,
  type SyncTriggerVerdict,
} from "@/modules/sync/domain/policies/sync-trigger.policy";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";
import { LOCK, type LockPort } from "@/shared/application/ports/lock.port";

// Instagram pagination cursors don't survive that long; older runs are
// abandoned instead of resumed.
const STALE_RUN_MS = 24 * 60 * 60 * 1000;
const LOCK_NAME = "followers-sync";
const LOCK_MARGIN_MS = 60_000;

export type SyncSkipReason =
  | SyncDenialReason
  | "not-configured"
  | "integration-blocked"
  | "already-running";

export type SyncOutcome =
  | { outcome: "executed"; resumed: boolean; run: SyncRunView }
  | { outcome: "skipped"; reason: SyncSkipReason; nextAllowedAt: Date | null };

@Injectable()
export class SyncCoordinatorService {
  private readonly logger = new Logger(SyncCoordinatorService.name);
  private readonly policy: SyncTriggerPolicy;

  constructor(
    @Inject(SYNC_RUN_REPOSITORY) private readonly runs: SyncRunRepositoryPort,
    @Inject(LOCK) private readonly lock: LockPort,
    @Inject(SYNC_SETTINGS) private readonly settings: SyncSettings,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly integration: IntegrationGuardService,
    private readonly engine: SyncEngineService,
    private readonly ownerResolver: OwnerResolverService,
  ) {
    this.policy = new SyncTriggerPolicy(settings);
  }

  async preview(trigger: SyncTrigger): Promise<SyncTriggerVerdict> {
    const now = this.clock.now();
    return this.policy.evaluate({
      trigger,
      history: await this.runs.dayHistory(this.clock.localDate(now)),
      now,
      startOfNextDay: this.clock.startOfNextLocalDay(now),
    });
  }

  async run(trigger: SyncTrigger): Promise<SyncOutcome> {
    const owner = await this.ownerResolver.resolve();
    const integration = await this.integration.status();
    // Sync needs both a configured session and an owner user that exists.
    if (!integration.configured || !owner) {
      return {
        outcome: "skipped",
        reason: "not-configured",
        nextAllowedAt: null,
      };
    }
    if (integration.blocked) {
      return {
        outcome: "skipped",
        reason: "integration-blocked",
        nextAllowedAt: null,
      };
    }

    const holder = randomUUID();
    if (
      !(await this.lock.tryAcquire(
        LOCK_NAME,
        holder,
        this.settings.timeBudgetMs + LOCK_MARGIN_MS,
      ))
    ) {
      return {
        outcome: "skipped",
        reason: "already-running",
        nextAllowedAt: null,
      };
    }

    try {
      const resumable = await this.findResumable();
      if (resumable) {
        resumable.resume(this.clock.now());
        await this.runs.save(resumable);
        await this.engine.execute(resumable, owner);
        return {
          outcome: "executed",
          resumed: true,
          run: resumable.toPrimitive(),
        };
      }

      const verdict = await this.preview(trigger);
      if (!verdict.allowed) {
        return {
          outcome: "skipped",
          reason: verdict.reason,
          nextAllowedAt: verdict.nextAllowedAt,
        };
      }

      const now = this.clock.now();
      const run = SyncRun.start({
        id: randomUUID(),
        trigger,
        localDate: this.clock.localDate(now),
        now,
      });
      await this.runs.save(run);
      await this.engine.execute(run, owner);
      return { outcome: "executed", resumed: false, run: run.toPrimitive() };
    } finally {
      await this.lock.release(LOCK_NAME, holder);
    }
  }

  // Unfinished runs are always resumed first, regardless of trigger/limits.
  private async findResumable(): Promise<SyncRun | null> {
    const unfinished = await this.runs.findUnfinished();
    if (!unfinished) return null;

    const now = this.clock.now();
    if (unfinished.isStale(now, STALE_RUN_MS)) {
      unfinished.fail(
        "ABANDONED",
        "Execução interrompida há mais de 24h.",
        now,
      );
      await this.runs.save(unfinished);
      await this.runs.deleteItems(unfinished.id);
      this.logger.warn(
        `Execução ${unfinished.id} abandonada por estar obsoleta.`,
      );
      return null;
    }
    return unfinished;
  }
}
