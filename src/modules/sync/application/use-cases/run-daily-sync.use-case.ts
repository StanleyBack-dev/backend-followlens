import { Injectable } from "@nestjs/common";
import {
  SyncCoordinatorService,
  type SyncOutcome,
} from "@/modules/sync/application/services/sync-coordinator.service";
import { SyncTrigger } from "@/modules/sync/domain/enums/sync-trigger.enum";

// Called once a day by the Vercel cron. Skips itself when the list was already
// synced today and resumes a paused run if any.
@Injectable()
export class RunDailySyncUseCase {
  constructor(private readonly coordinator: SyncCoordinatorService) {}

  execute(): Promise<SyncOutcome> {
    return this.coordinator.run(SyncTrigger.CRON);
  }
}
