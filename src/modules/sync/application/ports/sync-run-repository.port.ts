import type {
  SyncRun,
  SyncRunProps,
} from "@/modules/sync/domain/entities/sync-run";
import type { SyncDayHistory } from "@/modules/sync/domain/policies/sync-trigger.policy";
import type { PageRequest, Paginated } from "@/shared/application/pagination";

/** Follower staged during a run (username only, until the run completes). */
export type CollectedFollower = { username: string };

export type SyncRunView = SyncRunProps;

export interface SyncRunRepositoryPort {
  save(run: SyncRun): Promise<void>;
  /** Latest run that is PAUSED or still marked RUNNING. */
  findUnfinished(): Promise<SyncRun | null>;
  findLatestCompleted(): Promise<SyncRunView | null>;
  dayHistory(localDate: string): Promise<SyncDayHistory>;
  list(request: PageRequest): Promise<Paginated<SyncRunView>>;

  appendItems(runId: string, followers: CollectedFollower[]): Promise<void>;
  loadItems(runId: string): Promise<CollectedFollower[]>;
  deleteItems(runId: string): Promise<void>;
}

export const SYNC_RUN_REPOSITORY = Symbol("SYNC_RUN_REPOSITORY");
