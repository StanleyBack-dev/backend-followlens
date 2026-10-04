import { ConfigService } from "@nestjs/config";

/** What the Free plan is allowed; Pro (and admins) are not bound by these. */
export type PlanLimits = {
  /** Days a Free user waits between imports (the baseline is not counted). */
  freeImportIntervalDays: number;
  /** How far back a Free user sees the names of who unfollowed. */
  freeHistoryDays: number;
  /** Instagram profiles a user may track, per plan. */
  freeProfiles: number;
  proProfiles: number;
};

export const PLAN_LIMITS = Symbol("PLAN_LIMITS");

export function planLimitsFactory(config: ConfigService): PlanLimits {
  return {
    freeImportIntervalDays:
      config.get<number>("FREE_IMPORT_INTERVAL_DAYS") ?? 7,
    freeHistoryDays: config.get<number>("FREE_HISTORY_DAYS") ?? 30,
    freeProfiles: config.get<number>("FREE_PROFILE_LIMIT") ?? 1,
    proProfiles: config.get<number>("PRO_PROFILE_LIMIT") ?? 3,
  };
}

/** Register in every module that enforces a Free limit. */
export const planLimitsProvider = {
  provide: PLAN_LIMITS,
  useFactory: planLimitsFactory,
  inject: [ConfigService],
};
