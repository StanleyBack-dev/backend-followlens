import { Controller, Get } from "@nestjs/common";
import { InternalRoute } from "@/common/decorators/internal-route.decorator";
import {
  PurgeDeletedAccountsUseCase,
  type PurgeOutcome,
} from "@/modules/account/application/use-cases/purge-deleted-accounts.use-case";
import {
  RunSubscriptionLifecycleUseCase,
  type SubscriptionLifecycleOutcome,
} from "@/modules/billing/application/use-cases/run-subscription-lifecycle.use-case";

export type DailyMaintenanceOutcome = {
  subscriptions: SubscriptionLifecycleOutcome;
  accounts: PurgeOutcome;
};

// One scheduler endpoint for every daily housekeeping job, so the deploy needs
// a single cron entry for them (GET, as Vercel Cron only issues GET).
@InternalRoute()
@Controller("internal/maintenance")
export class InternalMaintenanceController {
  constructor(
    private readonly subscriptionLifecycle: RunSubscriptionLifecycleUseCase,
    private readonly purgeAccounts: PurgeDeletedAccountsUseCase,
  ) {}

  @Get("daily")
  async daily(): Promise<DailyMaintenanceOutcome> {
    // Subscriptions first: a purge then never removes a user mid-downgrade.
    const subscriptions = await this.subscriptionLifecycle.execute();
    const accounts = await this.purgeAccounts.execute();
    return { subscriptions, accounts };
  }
}
