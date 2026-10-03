import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { PaginationQueryDto } from "@/common/dtos/pagination-query.dto";
import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";
import type { RequestUser } from "@/modules/auth/presentation/guards/user-session.guard";
import type { SyncRunView } from "@/modules/sync/application/ports/sync-run-repository.port";
import {
  GetSyncStatusUseCase,
  type SyncStatus,
} from "@/modules/sync/application/use-cases/get-sync-status.use-case";
import { ListSyncRunsUseCase } from "@/modules/sync/application/use-cases/list-sync-runs.use-case";
import {
  type ManualSyncResult,
  RequestManualSyncUseCase,
} from "@/modules/sync/application/use-cases/request-manual-sync.use-case";
import type { Paginated } from "@/shared/application/pagination";

// Session-based sync is an owner-only feature (self-host). Non-owners get 403.
@Controller("sync")
export class SyncController {
  constructor(
    private readonly getStatus: GetSyncStatusUseCase,
    private readonly requestManualSync: RequestManualSyncUseCase,
    private readonly listRuns: ListSyncRunsUseCase,
  ) {}

  @Get("status")
  status(@CurrentUser() user: RequestUser): Promise<SyncStatus> {
    this.assertAdmin(user);
    return this.getStatus.execute();
  }

  // Long-running (up to the time budget): the BFF waits while the panel polls
  // /sync/status for progress.
  @Post("manual")
  @HttpCode(HttpStatus.OK)
  manual(@CurrentUser() user: RequestUser): Promise<ManualSyncResult> {
    this.assertAdmin(user);
    return this.requestManualSync.execute();
  }

  @Get("runs")
  runs(
    @CurrentUser() user: RequestUser,
    @Query() query: PaginationQueryDto,
  ): Promise<Paginated<SyncRunView>> {
    this.assertAdmin(user);
    return this.listRuns.execute(query);
  }

  private assertAdmin(user: RequestUser): void {
    if (!user.isAdmin) {
      throw AppException.from(APP_ERRORS.auth.adminOnly, undefined);
    }
  }
}
