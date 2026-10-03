import { Inject, Injectable } from "@nestjs/common";
import {
  SYNC_RUN_REPOSITORY,
  type SyncRunRepositoryPort,
  type SyncRunView,
} from "@/modules/sync/application/ports/sync-run-repository.port";
import type { PageRequest, Paginated } from "@/shared/application/pagination";

@Injectable()
export class ListSyncRunsUseCase {
  constructor(
    @Inject(SYNC_RUN_REPOSITORY) private readonly runs: SyncRunRepositoryPort,
  ) {}

  execute(request: PageRequest): Promise<Paginated<SyncRunView>> {
    return this.runs.list(request);
  }
}
