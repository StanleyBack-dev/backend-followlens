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
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";
import { LOCK, type LockPort } from "@/shared/application/ports/lock.port";

const LOCK_LEASE_MS = 60_000;

export type ImportActor = { id: string; email: string };

export type ImportResult = {
  import: ImportView;
  emailsSent: number;
};

// Orchestrates one upload for a specific user: lock → daily limit → parse →
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
  ) {}

  async execute(actor: ImportActor, file: UploadedFile): Promise<ImportResult> {
    if (file.buffer.byteLength > this.settings.maxFileBytes) {
      throw AppException.from(APP_ERRORS.imports.fileTooLarge, {
        maxMb: Math.round(this.settings.maxFileBytes / (1024 * 1024)),
      });
    }

    const holder = randomUUID();
    const lockName = `followers-import:${actor.id}`;
    if (!(await this.lock.tryAcquire(lockName, holder, LOCK_LEASE_MS))) {
      throw AppException.from(APP_ERRORS.imports.alreadyRunning, undefined);
    }

    try {
      const localDate = this.clock.localDate();
      if (
        (await this.imports.countCompletedOn(actor.id, localDate)) >=
        this.settings.dailyLimit
      ) {
        throw AppException.from(
          APP_ERRORS.imports.dailyLimitReached,
          undefined,
        );
      }

      const entries = this.parse(file);
      if (entries.length === 0) {
        await this.recordFailure(
          actor.id,
          file,
          "IMPORT_EMPTY_FOLLOWERS",
          localDate,
        );
        throw AppException.from(APP_ERRORS.imports.emptyFollowers, undefined);
      }

      const result = await this.apply(actor.id, file, entries, localDate);
      const emailsSent = await this.notifier.executeSafely(
        actor.id,
        actor.email,
      );
      return { import: result, emailsSent };
    } finally {
      await this.lock.release(lockName, holder);
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
    userId: string,
    file: UploadedFile,
    entries: { username: string; followedAt: Date | null }[],
    localDate: string,
  ): Promise<ImportView> {
    try {
      const outcome = await this.applySnapshot.execute(userId, {
        importId: randomUUID(),
        entries,
      });
      return this.imports.record({
        userId,
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
          userId,
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
    userId: string,
    file: UploadedFile,
    code: string,
    localDate: string,
    message?: string,
  ): Promise<void> {
    await this.imports.record({
      userId,
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
