import { Controller, Get } from "@nestjs/common";
import { InternalRoute } from "@/common/decorators/internal-route.decorator";
import {
  PurgeDeletedAccountsUseCase,
  type PurgeOutcome,
} from "@/modules/account/application/use-cases/purge-deleted-accounts.use-case";

// Scheduler endpoint (GET, as Vercel Cron only issues GET).
@InternalRoute()
@Controller("internal/account")
export class InternalAccountController {
  constructor(private readonly purgeAccounts: PurgeDeletedAccountsUseCase) {}

  @Get("purge")
  purge(): Promise<PurgeOutcome> {
    return this.purgeAccounts.execute();
  }
}
