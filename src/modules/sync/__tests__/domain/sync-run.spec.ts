import {
  SyncRun,
  SyncRunInvariantError,
} from "@/modules/sync/domain/entities/sync-run";
import { SyncRunStatus } from "@/modules/sync/domain/enums/sync-run-status.enum";
import { SyncTrigger } from "@/modules/sync/domain/enums/sync-trigger.enum";

const now = new Date("2026-10-02T12:00:00Z");
const start = () =>
  SyncRun.start({
    id: "run-1",
    trigger: SyncTrigger.MANUAL,
    localDate: "2026-10-02",
    now,
  });

describe("SyncRun", () => {
  it("tracks pagination progress", () => {
    const run = start();
    run.recordPage(25, "cursor-1", now);
    run.recordPage(10, null, now);
    expect(run.toPrimitive()).toMatchObject({
      pagesFetched: 2,
      followersCollected: 35,
      cursor: null,
    });
  });

  it("can pause and resume across invocations", () => {
    const run = start();
    run.recordPage(25, "cursor-1", now);
    run.pause("TIME_BUDGET", "tempo esgotado", now);
    expect(run.status).toBe(SyncRunStatus.PAUSED);

    run.resume(now);
    expect(run.status).toBe(SyncRunStatus.RUNNING);
    expect(run.cursor).toBe("cursor-1");
    expect(run.toPrimitive().invocations).toBe(2);
  });

  it("refuses to record pages when not running", () => {
    const run = start();
    run.pause("RATE_LIMITED", "429", now);
    expect(() => run.recordPage(1, null, now)).toThrow(SyncRunInvariantError);
  });

  it("cannot resume a finished run", () => {
    const run = start();
    run.complete({ lost: 0, gained: 0 }, now);
    expect(() => run.resume(now)).toThrow(SyncRunInvariantError);
  });
});
