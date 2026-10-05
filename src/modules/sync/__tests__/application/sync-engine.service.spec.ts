import type { ApplyFollowerSnapshotUseCase } from "@/modules/followers/application/use-cases/apply-follower-snapshot.use-case";
import { SnapshotRejectedError } from "@/modules/followers/domain/policies/snapshot-integrity.policy";
import type {
  FollowersPage,
  InstagramGatewayPort,
} from "@/modules/instagram/application/ports/instagram-gateway.port";
import {
  InstagramRateLimitError,
  InstagramSessionError,
} from "@/modules/instagram/domain/errors/instagram.errors";
import type { NotifyPendingUnfollowsUseCase } from "@/modules/notifications/notify-pending-unfollows.use-case";
import type {
  CollectedFollower,
  SyncRunRepositoryPort,
} from "@/modules/sync/application/ports/sync-run-repository.port";
import type { IntegrationGuardService } from "@/modules/sync/application/services/integration-guard.service";
import { SyncEngineService } from "@/modules/sync/application/services/sync-engine.service";
import type { SyncSettings } from "@/modules/sync/application/sync.config";
import { SyncRun } from "@/modules/sync/domain/entities/sync-run";
import { SyncRunStatus } from "@/modules/sync/domain/enums/sync-run-status.enum";
import { SyncTrigger } from "@/modules/sync/domain/enums/sync-trigger.enum";
import type { ClockPort } from "@/shared/application/ports/clock.port";

const follower = (username: string) => ({ username, followedAt: null });

class FakeClock implements ClockPort {
  current = new Date("2026-10-02T12:00:00Z").getTime();
  now() {
    return new Date(this.current);
  }
  async sleep(ms: number) {
    this.current += ms;
  }
  localDate() {
    return "2026-10-02";
  }
  startOfNextLocalDay() {
    return new Date("2026-10-03T03:00:00Z");
  }
  startOfLocalDate() {
    return new Date("2026-10-02T03:00:00Z");
  }
}

class InMemoryRuns implements Partial<SyncRunRepositoryPort> {
  items = new Map<string, CollectedFollower>();
  async save() {}
  async appendItems(_runId: string, followers: CollectedFollower[]) {
    followers.forEach((f) => this.items.set(f.username, f));
  }
  async loadItems() {
    return [...this.items.values()];
  }
  async deleteItems() {
    this.items.clear();
  }
}

const owner = {
  userId: "owner-user",
  email: "owner@test.com",
  profileId: "owner-profile",
};

const settings: SyncSettings = {
  manualDailyLimit: 1,
  minIntervalMinutes: 60,
  pageSize: 2,
  pageDelayMinMs: 1000,
  pageDelayMaxMs: 1000,
  timeBudgetMs: 60_000,
};

function setup(
  pages: Array<FollowersPage | Error>,
  overrides: Partial<SyncSettings> = {},
) {
  const clock = new FakeClock();
  const runs = new InMemoryRuns();
  const gateway: InstagramGatewayPort = {
    isConfigured: () => true,
    sessionFingerprint: () => "fp",
    ownUserId: () => "42",
    getOwnProfile: jest.fn(async () => ({
      userId: "42",
      username: "me",
      followerCount: 3,
    })),
    fetchFollowersPage: jest.fn(async () => {
      const next = pages.shift();
      if (next instanceof Error) throw next;
      return next as FollowersPage;
    }),
  };
  const apply = {
    execute: jest.fn(async () => ({
      baseline: false,
      collected: 3,
      lost: 1,
      gained: 0,
      returned: 0,
    })),
  } as unknown as ApplyFollowerSnapshotUseCase;
  const notifier = {
    executeSafely: jest.fn(async () => 1),
  } as unknown as NotifyPendingUnfollowsUseCase;
  const integration = { trip: jest.fn(async () => undefined) };

  const engine = new SyncEngineService(
    gateway,
    runs as unknown as SyncRunRepositoryPort,
    { ...settings, ...overrides },
    clock,
    integration as unknown as IntegrationGuardService,
    apply,
    notifier,
  );
  const run = SyncRun.start({
    id: "run-1",
    trigger: SyncTrigger.MANUAL,
    localDate: "2026-10-02",
    now: clock.now(),
  });
  return { engine, run, runs, apply, notifier, integration };
}

describe("SyncEngineService", () => {
  it("collects every page, applies the snapshot and notifies", async () => {
    const ctx = setup([
      { followers: [follower("ana"), follower("bia")], nextCursor: "c1" },
      { followers: [follower("caio")], nextCursor: null },
    ]);
    await ctx.engine.execute(ctx.run, owner);

    expect(ctx.run.status).toBe(SyncRunStatus.COMPLETED);
    expect(
      (ctx.apply.execute as jest.Mock).mock.calls[0][1].entries,
    ).toHaveLength(3);
    expect(ctx.notifier.executeSafely).toHaveBeenCalled();
    expect(ctx.runs.items.size).toBe(0);
  });

  it("pauses with the cursor saved when the time budget runs out", async () => {
    const ctx = setup(
      [
        { followers: [follower("ana")], nextCursor: "c1" },
        { followers: [follower("bia")], nextCursor: null },
      ],
      { timeBudgetMs: 5_000 },
    );
    await ctx.engine.execute(ctx.run, owner);
    expect(ctx.run.status).toBe(SyncRunStatus.PAUSED);
    expect(ctx.run.cursor).toBe("c1");
    expect(ctx.apply.execute).not.toHaveBeenCalled();
  });

  it("pauses (resumable) when Instagram rate limits", async () => {
    const ctx = setup([new InstagramRateLimitError()]);
    await ctx.engine.execute(ctx.run, owner);
    expect(ctx.run.status).toBe(SyncRunStatus.PAUSED);
    expect(ctx.run.toPrimitive().errorCode).toBe("RATE_LIMITED");
  });

  it("fails and trips the circuit breaker on a session error", async () => {
    const ctx = setup([new InstagramSessionError("checkpoint_required")]);
    await ctx.engine.execute(ctx.run, owner);
    expect(ctx.run.status).toBe(SyncRunStatus.FAILED);
    expect(ctx.integration.trip).toHaveBeenCalledWith("checkpoint_required");
  });

  it("fails without touching followers when the snapshot is rejected", async () => {
    const ctx = setup([{ followers: [follower("ana")], nextCursor: null }]);
    (ctx.apply.execute as jest.Mock).mockRejectedValueOnce(
      new SnapshotRejectedError("muitas perdas"),
    );
    await ctx.engine.execute(ctx.run, owner);
    expect(ctx.run.status).toBe(SyncRunStatus.FAILED);
    expect(ctx.run.toPrimitive().errorCode).toBe("SNAPSHOT_REJECTED");
    expect(ctx.notifier.executeSafely).not.toHaveBeenCalled();
  });
});
