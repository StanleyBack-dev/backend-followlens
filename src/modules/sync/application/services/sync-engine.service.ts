import { Inject, Injectable, Logger } from "@nestjs/common";
import { ApplyFollowerSnapshotUseCase } from "@/modules/followers/application/use-cases/apply-follower-snapshot.use-case";
import { SnapshotRejectedError } from "@/modules/followers/domain/policies/snapshot-integrity.policy";
import {
  INSTAGRAM_GATEWAY,
  type InstagramGatewayPort,
} from "@/modules/instagram/application/ports/instagram-gateway.port";
import {
  InstagramError,
  InstagramRateLimitError,
  InstagramSessionError,
} from "@/modules/instagram/domain/errors/instagram.errors";
import { NotifyPendingUnfollowsUseCase } from "@/modules/notifications/notify-pending-unfollows.use-case";
import {
  SYNC_RUN_REPOSITORY,
  type SyncRunRepositoryPort,
} from "@/modules/sync/application/ports/sync-run-repository.port";
import { IntegrationGuardService } from "@/modules/sync/application/services/integration-guard.service";
import {
  SYNC_SETTINGS,
  type SyncSettings,
} from "@/modules/sync/application/sync.config";
import type { SyncRun } from "@/modules/sync/domain/entities/sync-run";
import type { SyncOwner } from "@/modules/sync/application/services/owner-resolver.service";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

// Upper bound for one page request + persistence, used to decide whether
// another page still fits in the time budget.
const PAGE_ROUNDTRIP_ESTIMATE_MS = 8_000;

// Executes a RUNNING sync run within the invocation's time budget:
//   paginate followers -> stage them -> (when the list ends) apply the
//   snapshot -> send unfollow alerts.
// Leaves the run PAUSED (resumable from its cursor) when time runs out or
// Instagram asks to slow down.
@Injectable()
export class SyncEngineService {
  private readonly logger = new Logger(SyncEngineService.name);

  constructor(
    @Inject(INSTAGRAM_GATEWAY) private readonly gateway: InstagramGatewayPort,
    @Inject(SYNC_RUN_REPOSITORY) private readonly runs: SyncRunRepositoryPort,
    @Inject(SYNC_SETTINGS) private readonly settings: SyncSettings,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly integration: IntegrationGuardService,
    private readonly applySnapshot: ApplyFollowerSnapshotUseCase,
    private readonly notifier: NotifyPendingUnfollowsUseCase,
  ) {}

  async execute(run: SyncRun, owner: SyncOwner): Promise<void> {
    const deadline = this.clock.now().getTime() + this.settings.timeBudgetMs;
    try {
      const listEnded = await this.collect(run, deadline);
      if (!listEnded) return;
      await this.finish(run, owner);
    } catch (error) {
      await this.handleFailure(run, error);
    }
  }

  /** @returns true when the whole list was collected. */
  private async collect(run: SyncRun, deadline: number): Promise<boolean> {
    if (!run.hasTarget) {
      run.setTarget(this.gateway.ownUserId(), this.clock.now());
      await this.runs.save(run);
    }

    // A resumed run with pages but no cursor already reached the list end.
    let firstPage = run.pagesFetched === 0;
    while (firstPage || run.cursor !== null) {
      firstPage = false;
      const page = await this.gateway.fetchFollowersPage({
        userId: run.igUserId as string,
        cursor: run.cursor,
        pageSize: this.settings.pageSize,
      });

      await this.runs.appendItems(run.id, page.followers);
      run.recordPage(page.followers.length, page.nextCursor, this.clock.now());
      await this.runs.save(run);

      if (page.nextCursor === null) return true;

      const delay = this.randomDelay();
      if (
        this.clock.now().getTime() + delay + PAGE_ROUNDTRIP_ESTIMATE_MS >
        deadline
      ) {
        run.pause(
          "TIME_BUDGET",
          "Tempo da invocação esgotado; continua na próxima execução.",
          this.clock.now(),
        );
        await this.runs.save(run);
        return false;
      }
      await this.clock.sleep(delay);
    }
    return true;
  }

  private async finish(run: SyncRun, owner: SyncOwner): Promise<void> {
    const followers = await this.runs.loadItems(run.id);
    try {
      const result = await this.applySnapshot.execute(owner.profileId, {
        importId: run.id,
        entries: followers.map((f) => ({
          username: f.username,
          followedAt: null,
        })),
      });
      run.complete(
        { lost: result.lost, gained: result.gained + result.returned },
        this.clock.now(),
      );
      await this.runs.save(run);
      await this.runs.deleteItems(run.id);
      await this.notifier.executeSafely(owner.profileId, owner.email);
    } catch (error) {
      if (error instanceof SnapshotRejectedError) {
        run.fail("SNAPSHOT_REJECTED", error.reason, this.clock.now());
        await this.runs.save(run);
        await this.runs.deleteItems(run.id);
        this.logger.warn(`Snapshot ${run.id} rejeitado: ${error.reason}`);
        return;
      }
      throw error;
    }
  }

  private async handleFailure(run: SyncRun, error: unknown): Promise<void> {
    const now = this.clock.now();
    if (error instanceof InstagramSessionError) {
      run.fail("SESSION_INVALID", error.message, now);
      await this.runs.save(run);
      await this.integration.trip(error.reason);
      return;
    }
    if (error instanceof InstagramRateLimitError) {
      run.pause("RATE_LIMITED", error.message, now);
      await this.runs.save(run);
      return;
    }
    if (error instanceof InstagramError) {
      run.pause("INSTAGRAM_UNAVAILABLE", error.message, now);
      await this.runs.save(run);
      return;
    }
    run.fail(
      "UNEXPECTED",
      error instanceof Error ? error.message : String(error),
      now,
    );
    await this.runs.save(run);
    throw error;
  }

  private randomDelay(): number {
    const { pageDelayMinMs: min, pageDelayMaxMs: max } = this.settings;
    return Math.floor(min + Math.random() * (max - min));
  }
}
