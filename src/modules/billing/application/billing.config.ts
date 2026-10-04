import type { ConfigService } from "@nestjs/config";
import { BillingCycle } from "@/modules/billing/domain/enums/billing-cycle.enum";

export type BillingSettings = {
  /** Pro price in BRL per cycle. */
  prices: Record<BillingCycle, number>;
  /** Days a subscription may stay overdue before going back to Free. */
  pastDueGraceDays: number;
  /** Pix Automático has to be enabled by the gateway for the account. */
  pixAutomaticEnabled: boolean;
};

export const BILLING_SETTINGS = Symbol("BILLING_SETTINGS");

export function billingSettingsFactory(config: ConfigService): BillingSettings {
  return {
    prices: {
      [BillingCycle.MONTHLY]:
        config.get<number>("PRO_PLAN_PRICE_MONTHLY") ?? 14.9,
      [BillingCycle.YEARLY]:
        config.get<number>("PRO_PLAN_PRICE_YEARLY") ?? 119.9,
    },
    pastDueGraceDays: config.get<number>("BILLING_PAST_DUE_GRACE_DAYS") ?? 3,
    pixAutomaticEnabled:
      config.get<boolean>("BILLING_PIX_AUTOMATIC_ENABLED") === true,
  };
}
