import { Controller, Get } from "@nestjs/common";
import { InternalRoute } from "@/common/decorators/internal-route.decorator";
import type { SyncOutcome } from "@/modules/sync/application/services/sync-coordinator.service";
import { RunDailySyncUseCase } from "@/modules/sync/application/use-cases/run-daily-sync.use-case";

// Scheduler endpoint (GET, as Vercel Cron only issues GET). A skip is a normal
// outcome and returns 200 so the scheduler doesn't retry it.
@InternalRoute()
@Controller("internal/sync")
export class InternalSyncController {
  constructor(private readonly dailySync: RunDailySyncUseCase) {}

  @Get("daily")
  daily(): Promise<SyncOutcome> {
    return this.dailySync.execute();
  }
}
