import type { ConfigService } from "@nestjs/config";

export type SyncSettings = {
  manualDailyLimit: number;
  minIntervalMinutes: number;
  pageSize: number;
  pageDelayMinMs: number;
  pageDelayMaxMs: number;
  timeBudgetMs: number;
};

export const SYNC_SETTINGS = Symbol("SYNC_SETTINGS");

export function syncSettingsFactory(config: ConfigService): SyncSettings {
  const delayMin = config.get<number>("SYNC_PAGE_DELAY_MIN_MS") ?? 2000;
  const delayMax = config.get<number>("SYNC_PAGE_DELAY_MAX_MS") ?? 5000;
  return {
    manualDailyLimit: config.get<number>("SYNC_MANUAL_DAILY_LIMIT") ?? 1,
    minIntervalMinutes: config.get<number>("SYNC_MIN_INTERVAL_MINUTES") ?? 60,
    pageSize: config.get<number>("SYNC_PAGE_SIZE") ?? 25,
    pageDelayMinMs: Math.min(delayMin, delayMax),
    pageDelayMaxMs: Math.max(delayMin, delayMax),
    timeBudgetMs: config.get<number>("SYNC_TIME_BUDGET_MS") ?? 240_000,
  };
}
