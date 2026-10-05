import type { ApplyFollowerSnapshotUseCase } from "@/modules/followers/application/use-cases/apply-follower-snapshot.use-case";
import { SnapshotRejectedError } from "@/modules/followers/domain/policies/snapshot-integrity.policy";
import type { ExportFileReaderPort } from "@/modules/imports/application/ports/export-file-reader.port";
import type { ImportRepositoryPort } from "@/modules/imports/application/ports/import-repository.port";
import type { ImportSettings } from "@/modules/imports/application/imports.config";
import { ImportFollowersExportUseCase } from "@/modules/imports/application/use-cases/import-followers-export.use-case";
import { ImportStatus } from "@/modules/imports/domain/enums/import-status.enum";
import { ExportParseError } from "@/modules/imports/domain/instagram-export.parser";
import type { ClockPort } from "@/shared/application/ports/clock.port";
import type { LockPort } from "@/shared/application/ports/lock.port";

const file = { filename: "export.zip", buffer: Buffer.from("x") };
const actor = { profileId: "profile-1", email: "u@test.com", pro: true };
const freeActor = { ...actor, pro: false };

function build(overrides: {
  reader?: Partial<ExportFileReaderPort>;
  apply?: Partial<ApplyFollowerSnapshotUseCase>;
  completedToday?: number;
  lockFree?: boolean;
  settings?: Partial<ImportSettings>;
  lastComparisonAt?: Date | null;
}) {
  const records: { status: ImportStatus; errorCode: string | null }[] = [];
  const clock = {
    now: () => new Date("2026-10-02T12:00:00Z"),
    sleep: async () => undefined,
    localDate: () => "2026-10-02",
    startOfNextLocalDay: () => new Date("2026-10-03T03:00:00Z"),
    startOfLocalDate: () => new Date("2026-10-02T03:00:00Z"),
  } as ClockPort;

  const lock = {
    tryAcquire: jest.fn(async () => overrides.lockFree ?? true),
    release: jest.fn(async () => undefined),
  } as LockPort & Record<string, jest.Mock>;

  const reader = {
    read: jest.fn(() => [{ username: "ana", followedAt: null }]),
    ...overrides.reader,
  } as unknown as ExportFileReaderPort;

  const imports = {
    record: jest.fn(async (input) => {
      records.push({ status: input.status, errorCode: input.errorCode });
      return { id: "imp-1", ...input };
    }),
    countCompletedOn: jest.fn(async () => overrides.completedToday ?? 0),
    findLastComparisonAt: jest.fn(
      async () => overrides.lastComparisonAt ?? null,
    ),
  } as unknown as ImportRepositoryPort & Record<string, jest.Mock>;

  const notifier = {
    executeSafely: jest.fn(async () => 2),
    dismissSafely: jest.fn(async () => 0),
  } as unknown as import("@/modules/notifications/notify-pending-unfollows.use-case").NotifyPendingUnfollowsUseCase &
    Record<string, jest.Mock>;

  const apply = {
    execute: jest.fn(async () => ({
      baseline: false,
      collected: 10,
      lost: 1,
      gained: 2,
      returned: 0,
    })),
    ...overrides.apply,
  } as unknown as ApplyFollowerSnapshotUseCase;

  const settings: ImportSettings = {
    dailyLimit: 10,
    maxFileBytes: 4 * 1024 * 1024,
    maxUnzippedBytes: 64 * 1024 * 1024,
    maxZipEntries: 64,
    ...overrides.settings,
  };

  const useCase = new ImportFollowersExportUseCase(
    reader,
    imports,
    settings,
    lock,
    clock,
    apply,
    notifier,
    {
      freeImportIntervalDays: 7,
      freeHistoryDays: 30,
      freeProfiles: 1,
      proProfiles: 3,
    },
  );
  return { useCase, records, lock, imports, notifier, apply };
}

describe("ImportFollowersExportUseCase", () => {
  it("imports a valid file, records it and sends alerts", async () => {
    const ctx = build({});
    const result = await ctx.useCase.execute(actor, file);

    expect(result.import.status).toBe(ImportStatus.COMPLETED);
    expect(result.import.lostCount).toBe(1);
    expect(result.import.gainedCount).toBe(2);
    expect(result.emailsSent).toBe(2);
    expect(ctx.lock.release).toHaveBeenCalled();
  });

  it("makes a Free user wait between imports", async () => {
    const ctx = build({ lastComparisonAt: new Date("2026-09-30T12:00:00Z") });
    await expect(ctx.useCase.execute(freeActor, file)).rejects.toMatchObject({
      response: {
        code: "IMPORT_PLAN_INTERVAL_NOT_ELAPSED",
        details: { nextAllowedAt: "2026-10-07T12:00:00.000Z" },
      },
    });
    expect(ctx.apply.execute).not.toHaveBeenCalled();
  });

  it("lets a Free user import once the interval has passed, without the e-mail alert", async () => {
    const ctx = build({ lastComparisonAt: new Date("2026-09-20T12:00:00Z") });
    const result = await ctx.useCase.execute(freeActor, file);

    expect(result.import.status).toBe(ImportStatus.COMPLETED);
    expect(result.emailsSent).toBe(0);
    expect(ctx.notifier.dismissSafely).toHaveBeenCalledWith("profile-1");
    expect(ctx.notifier.executeSafely).not.toHaveBeenCalled();
  });

  it("does not apply the Free interval to a Pro user", async () => {
    const ctx = build({ lastComparisonAt: new Date("2026-10-02T11:00:00Z") });
    const result = await ctx.useCase.execute(actor, file);

    expect(result.import.status).toBe(ImportStatus.COMPLETED);
    expect(ctx.imports.findLastComparisonAt).not.toHaveBeenCalled();
  });

  it("rejects a file above the size limit before touching anything", async () => {
    const ctx = build({ settings: { maxFileBytes: 0 } });
    await expect(ctx.useCase.execute(actor, file)).rejects.toMatchObject({
      response: { code: "IMPORT_FILE_TOO_LARGE" },
    });
    expect(ctx.lock.tryAcquire).not.toHaveBeenCalled();
  });

  it("refuses when another import holds the lock", async () => {
    const ctx = build({ lockFree: false });
    await expect(ctx.useCase.execute(actor, file)).rejects.toMatchObject({
      response: { code: "IMPORT_ALREADY_RUNNING" },
    });
  });

  it("blocks once the daily limit is reached", async () => {
    const ctx = build({ completedToday: 10 });
    await expect(ctx.useCase.execute(actor, file)).rejects.toMatchObject({
      response: { code: "IMPORT_DAILY_LIMIT_REACHED" },
    });
    expect(ctx.lock.release).toHaveBeenCalled();
  });

  it("records a failure and 422 on an unreadable file", async () => {
    const ctx = build({
      reader: {
        read: jest.fn(() => {
          throw new ExportParseError("bad");
        }),
      },
    });
    await expect(ctx.useCase.execute(actor, file)).rejects.toMatchObject({
      response: { code: "IMPORT_INVALID_FILE" },
    });
  });

  it("records a failure and 422 when the file has no followers", async () => {
    const ctx = build({ reader: { read: jest.fn(() => []) } });
    await expect(ctx.useCase.execute(actor, file)).rejects.toMatchObject({
      response: { code: "IMPORT_EMPTY_FOLLOWERS" },
    });
    expect(ctx.records.at(-1)).toMatchObject({ status: ImportStatus.FAILED });
  });

  it("records a failure when the snapshot is rejected (mass loss)", async () => {
    const ctx = build({
      apply: {
        execute: jest.fn(async () => {
          throw new SnapshotRejectedError("muitas perdas");
        }),
      },
    });
    await expect(ctx.useCase.execute(actor, file)).rejects.toMatchObject({
      response: { code: "IMPORT_SNAPSHOT_REJECTED" },
    });
    expect(ctx.records.at(-1)).toMatchObject({
      status: ImportStatus.FAILED,
      errorCode: "IMPORT_SNAPSHOT_REJECTED",
    });
    expect(ctx.notifier.executeSafely).not.toHaveBeenCalled();
  });

  it("still succeeds when the alert email fails (notifier absorbs it)", async () => {
    const ctx = build({});
    (ctx.notifier.executeSafely as jest.Mock).mockResolvedValueOnce(0);
    const result = await ctx.useCase.execute(actor, file);
    expect(result.import.status).toBe(ImportStatus.COMPLETED);
    expect(result.emailsSent).toBe(0);
  });
});
