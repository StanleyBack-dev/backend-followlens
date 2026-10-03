import { SyncTrigger } from "@/modules/sync/domain/enums/sync-trigger.enum";
import {
  type SyncDayHistory,
  SyncTriggerPolicy,
} from "@/modules/sync/domain/policies/sync-trigger.policy";

const policy = new SyncTriggerPolicy({
  manualDailyLimit: 1,
  minIntervalMinutes: 60,
});
const now = new Date("2026-10-02T15:00:00Z");
const startOfNextDay = new Date("2026-10-03T03:00:00Z");
const emptyDay: SyncDayHistory = {
  manualStartedToday: 0,
  completedToday: 0,
  lastStartedAt: null,
};

const evaluate = (trigger: SyncTrigger, history: Partial<SyncDayHistory>) =>
  policy.evaluate({
    trigger,
    history: { ...emptyDay, ...history },
    now,
    startOfNextDay,
  });

describe("SyncTriggerPolicy", () => {
  it("allows the first manual sync of the day", () => {
    expect(evaluate(SyncTrigger.MANUAL, {})).toEqual({ allowed: true });
  });

  it("blocks a second manual sync until the next day", () => {
    expect(evaluate(SyncTrigger.MANUAL, { manualStartedToday: 1 })).toEqual({
      allowed: false,
      reason: "manual-daily-limit",
      nextAllowedAt: startOfNextDay,
    });
  });

  it("skips the daily cron when the list was already synced today", () => {
    expect(evaluate(SyncTrigger.CRON, { completedToday: 1 })).toMatchObject({
      allowed: false,
      reason: "already-synced-today",
    });
  });

  it("enforces the minimum interval between any two syncs", () => {
    const lastStartedAt = new Date(now.getTime() - 20 * 60_000);
    expect(evaluate(SyncTrigger.CRON, { lastStartedAt })).toEqual({
      allowed: false,
      reason: "min-interval",
      nextAllowedAt: new Date(lastStartedAt.getTime() + 60 * 60_000),
    });
  });
});
