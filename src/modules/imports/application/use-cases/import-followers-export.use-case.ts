import { randomUUID } from "crypto";
import { Inject, Injectable } from "@nestjs/common";
import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";
import { ApplyFollowerSnapshotUseCase } from "@/modules/followers/application/use-cases/apply-follower-snapshot.use-case";
import { SnapshotRejectedError } from "@/modules/followers/domain/policies/snapshot-integrity.policy";
import {
  EXPORT_FILE_READER,
  type ExportFileReaderPort,
  type UploadedFile,
} from "@/modules/imports/application/ports/export-file-reader.port";
import {
  IMPORT_REPOSITORY,
  type ImportRepositoryPort,
  type ImportView,
} from "@/modules/imports/application/ports/import-repository.port";
import {
  IMPORT_SETTINGS,
  type ImportSettings,
} from "@/modules/imports/application/imports.config";
import { ImportStatus } from "@/modules/imports/domain/enums/import-status.enum";
import { ExportParseError } from "@/modules/imports/domain/instagram-export.parser";
import { NotifyPendingUnfollowsUseCase } from "@/modules/notifications/notify-pending-unfollows.use-case";
import {
  PLAN_LIMITS,
  type PlanLimits,
} from "@/shared/application/plan-limits.config";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";
import { LOCK, type LockPort } from "@/shared/application/ports/lock.port";

const LOCK_LEASE_MS = 60_000;
const DAY_MS = 86_400_000;

export type ImportActor = {
  /** The profile the file is imported into. */
  profileId: string;
  /** Where the unfollow alert goes. */
  email: string;
  /** Pro access lifts the Free interval and enables the e-mail alert. */
  pro: boolean;
};

/** When a Free user may import again, or null when there is no wait. */
export function nextFreeImportAt(
  lastComparisonAt: Date | null,
  intervalDays: number,
  now: Date,
): Date | null {
  if (!lastComparisonAt || intervalDays <= 0) return null;
  const next = new Date(lastComparisonAt.getTime() + intervalDays * DAY_MS);
  return next > now ? next : null;
}

export type ImportResult = {
  import: ImportView;
  emailsSent: number;
};

// Orchestrates one upload into a specific profile: lock → limits → parse →
// diff/apply → notify. A failed attempt is recorded but does NOT consume the
// daily limit (only completed imports count).
@Injectable()
export class ImportFollowersExportUseCase {
  constructor(
    @Inject(EXPORT_FILE_READER) private readonly reader: ExportFileReaderPort,
    @Inject(IMPORT_REPOSITORY) private readonly imports: ImportRepositoryPort,
    @Inject(IMPORT_SETTINGS) private readonly settings: ImportSettings,
    @Inject(LOCK) private readonly lock: LockPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly applySnapshot: ApplyFollowerSnapshotUseCase,
    private readonly notifier: NotifyPendingUnfollowsUseCase,
    @Inject(PLAN_LIMITS) private readonly planLimits: PlanLimits,
  ) {}

  async execute(actor: ImportActor, file: UploadedFile): Promise<ImportResult> {
    if (file.buffer.byteLength > this.settings.maxFileBytes) {
      throw AppException.from(APP_ERRORS.imports.fileTooLarge, {
        maxMb: Math.round(this.settings.maxFileBytes / (1024 * 1024)),
      });
    }

    const holder = randomUUID();
    const lockName = `followers-import:${actor.profileId}`;
    if (!(await this.lock.tryAcquire(lockName, holder, LOCK_LEASE_MS))) {
      throw AppException.from(APP_ERRORS.imports.alreadyRunning, undefined);
    }

    try {
      const localDate = this.clock.localDate();
      if (
        (await this.imports.countCompletedOn(actor.profileId, localDate)) >=
        this.settings.dailyLimit
      ) {
        throw AppException.from(
          APP_ERRORS.imports.dailyLimitReached,
          undefined,
        );
      }

      if (!actor.pro) await this.assertFreeIntervalElapsed(actor.profileId);

      const entries = this.parse(file);
      if (entries.length === 0) {
        await this.recordFailure(
          actor.profileId,
          file,
          "IMPORT_EMPTY_FOLLOWERS",
          localDate,
        );
        throw AppException.from(APP_ERRORS.imports.emptyFollowers, undefined);
      }

      const result = await this.apply(
        actor.profileId,
        file,
        entries,
        localDate,
      );
      // The e-mail alert is a Pro feature; on Free the events are settled
      // silently so an upgrade later doesn't e-mail the whole backlog.
      const emailsSent = actor.pro
        ? await this.notifier.executeSafely(actor.profileId, actor.email)
        : await this.notifier.dismissSafely(actor.profileId);
      return { import: result, emailsSent };
    } finally {
      await this.lock.release(lockName, holder);
    }
  }

  private async assertFreeIntervalElapsed(profileId: string): Promise<void> {
    const days = this.planLimits.freeImportIntervalDays;
    const nextAllowedAt = nextFreeImportAt(
      await this.imports.findLastComparisonAt(profileId),
      days,
      this.clock.now(),
    );
    if (nextAllowedAt) {
      throw AppException.from(
        APP_ERRORS.imports.planIntervalNotElapsed,
        { days },
        { nextAllowedAt: nextAllowedAt.toISOString() },
      );
    }
  }

  private parse(file: UploadedFile) {
    try {
      return this.reader.read(file).map((follower) => ({
        username: follower.username,
        followedAt: follower.followedAt,
      }));
    } catch (error) {
      if (error instanceof ExportParseError) {
        throw AppException.from(APP_ERRORS.imports.invalidFile, undefined, {
          reason: error.message,
        });
      }
      throw error;
    }
  }

  private async apply(
    profileId: string,
    file: UploadedFile,
    entries: { username: string; followedAt: Date | null }[],
    localDate: string,
  ): Promise<ImportView> {
    try {
      const outcome = await this.applySnapshot.execute(profileId, {
        importId: randomUUID(),
        entries,
      });
      return this.imports.record({
        profileId,
        status: ImportStatus.COMPLETED,
        filename: this.safeName(file.filename),
        followersCount: outcome.collected,
        baseline: outcome.baseline,
        lostCount: outcome.lost,
        gainedCount: outcome.gained + outcome.returned,
        errorCode: null,
        errorMessage: null,
        localDate,
        createdAt: this.clock.now(),
      });
    } catch (error) {
      if (error instanceof SnapshotRejectedError) {
        await this.recordFailure(
          profileId,
          file,
          "IMPORT_SNAPSHOT_REJECTED",
          localDate,
          error.reason,
        );
        throw AppException.from(APP_ERRORS.imports.snapshotRejected, {
          reason: error.reason,
        });
      }
      throw error;
    }
  }

  private async recordFailure(
    profileId: string,
    file: UploadedFile,
    code: string,
    localDate: string,
    message?: string,
  ): Promise<void> {
    await this.imports.record({
      profileId,
      status: ImportStatus.FAILED,
      filename: this.safeName(file.filename),
      followersCount: null,
      baseline: false,
      lostCount: null,
      gainedCount: null,
      errorCode: code,
      errorMessage: message ?? null,
      localDate,
      createdAt: this.clock.now(),
    });
  }

  private safeName(filename: string): string {
    return filename.slice(0, 160);
  }
}
