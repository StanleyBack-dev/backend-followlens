import { SyncTrigger } from "@/modules/sync/domain/enums/sync-trigger.enum";

export type SyncTriggerRules = {
  manualDailyLimit: number;
  minIntervalMinutes: number;
};

export type SyncDayHistory = {
  manualStartedToday: number;
  completedToday: number;
  lastStartedAt: Date | null;
};

export type SyncDenialReason =
  "manual-daily-limit" | "already-synced-today" | "min-interval";

export type SyncTriggerVerdict =
  | { allowed: true }
  | { allowed: false; reason: SyncDenialReason; nextAllowedAt: Date };

// Safety locks that keep the session's request volume close to a human's:
//  - manual sync: at most N per calendar day;
//  - daily cron: skipped when already synced today;
//  - any trigger: a minimum gap between two syncs.
export class SyncTriggerPolicy {
  constructor(private readonly rules: SyncTriggerRules) {}

  evaluate(params: {
    trigger: SyncTrigger;
    history: SyncDayHistory;
    now: Date;
    startOfNextDay: Date;
  }): SyncTriggerVerdict {
    const { trigger, history, now, startOfNextDay } = params;

    if (
      trigger === SyncTrigger.MANUAL &&
      history.manualStartedToday >= this.rules.manualDailyLimit
    ) {
      return {
        allowed: false,
        reason: "manual-daily-limit",
        nextAllowedAt: startOfNextDay,
      };
    }

    if (trigger === SyncTrigger.CRON && history.completedToday > 0) {
      return {
        allowed: false,
        reason: "already-synced-today",
        nextAllowedAt: startOfNextDay,
      };
    }

    if (history.lastStartedAt) {
      const nextAllowedAt = new Date(
        history.lastStartedAt.getTime() +
          this.rules.minIntervalMinutes * 60_000,
      );
      if (nextAllowedAt > now) {
        return { allowed: false, reason: "min-interval", nextAllowedAt };
      }
    }

    return { allowed: true };
  }
}
