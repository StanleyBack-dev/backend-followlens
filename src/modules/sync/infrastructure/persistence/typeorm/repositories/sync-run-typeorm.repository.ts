import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, In } from "typeorm";
import type {
  CollectedFollower,
  SyncRunRepositoryPort,
  SyncRunView,
} from "@/modules/sync/application/ports/sync-run-repository.port";
import { SyncRun } from "@/modules/sync/domain/entities/sync-run";
import { SyncRunStatus } from "@/modules/sync/domain/enums/sync-run-status.enum";
import type { SyncDayHistory } from "@/modules/sync/domain/policies/sync-trigger.policy";
import { SyncRunItemOrmEntity } from "@/modules/sync/infrastructure/persistence/typeorm/entities/sync-run-item.orm-entity";
import { SyncRunOrmEntity } from "@/modules/sync/infrastructure/persistence/typeorm/entities/sync-run.orm-entity";
import {
  paginate,
  type PageRequest,
  type Paginated,
} from "@/shared/application/pagination";

const ITEMS_CHUNK = 500;

// A run that failed before fetching a single page never reached the follower
// list, so it doesn't count against the daily limit.
const COUNTS_AS_ATTEMPT = `NOT (r.status = '${SyncRunStatus.FAILED}' AND r.pages_fetched = 0)`;

@Injectable()
export class SyncRunTypeormRepository implements SyncRunRepositoryPort {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get runsRepo() {
    return this.dataSource.getRepository(SyncRunOrmEntity);
  }
  private get itemsRepo() {
    return this.dataSource.getRepository(SyncRunItemOrmEntity);
  }

  async save(run: SyncRun): Promise<void> {
    await this.runsRepo.save(this.runsRepo.create(run.toPrimitive()));
  }

  async findUnfinished(): Promise<SyncRun | null> {
    const row = await this.runsRepo.findOne({
      where: { status: In([SyncRunStatus.RUNNING, SyncRunStatus.PAUSED]) },
      order: { startedAt: "DESC" },
    });
    return row ? SyncRun.restore(toView(row)) : null;
  }

  async findLatestCompleted(): Promise<SyncRunView | null> {
    const row = await this.runsRepo.findOne({
      where: { status: SyncRunStatus.COMPLETED },
      order: { finishedAt: "DESC" },
    });
    return row ? toView(row) : null;
  }

  async dayHistory(localDate: string): Promise<SyncDayHistory> {
    const counts = await this.runsRepo
      .createQueryBuilder("r")
      .select(
        `COUNT(*) FILTER (WHERE r.trigger = 'manual' AND ${COUNTS_AS_ATTEMPT})::int`,
        "manual",
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE r.status = '${SyncRunStatus.COMPLETED}')::int`,
        "completed",
      )
      .where("r.local_date = :localDate", { localDate })
      .getRawOne<{ manual: number; completed: number }>();

    const last = await this.runsRepo
      .createQueryBuilder("r")
      .select("MAX(r.started_at)", "lastStartedAt")
      .where(COUNTS_AS_ATTEMPT)
      .getRawOne<{ lastStartedAt: Date | string | null }>();

    return {
      manualStartedToday: Number(counts?.manual ?? 0),
      completedToday: Number(counts?.completed ?? 0),
      lastStartedAt: last?.lastStartedAt ? new Date(last.lastStartedAt) : null,
    };
  }

  async list(request: PageRequest): Promise<Paginated<SyncRunView>> {
    const [rows, total] = await this.runsRepo.findAndCount({
      order: { startedAt: "DESC" },
      skip: (request.page - 1) * request.limit,
      take: request.limit,
    });
    return paginate(rows.map(toView), total, request);
  }

  async appendItems(
    runId: string,
    followers: CollectedFollower[],
  ): Promise<void> {
    for (let i = 0; i < followers.length; i += ITEMS_CHUNK) {
      const batch = followers.slice(i, i + ITEMS_CHUNK);
      await this.itemsRepo
        .createQueryBuilder()
        .insert()
        .into(SyncRunItemOrmEntity)
        .values(
          batch.map((f) => ({
            syncRunId: runId,
            username: f.username.slice(0, 64),
          })),
        )
        // A page re-fetched after a crash must not fail on duplicates.
        .orIgnore()
        .execute();
    }
  }

  async loadItems(runId: string): Promise<CollectedFollower[]> {
    const rows = await this.itemsRepo.find({ where: { syncRunId: runId } });
    return rows.map((row) => ({ username: row.username }));
  }

  async deleteItems(runId: string): Promise<void> {
    await this.itemsRepo.delete({ syncRunId: runId });
  }
}

function toView(row: SyncRunOrmEntity): SyncRunView {
  return {
    id: row.id,
    trigger: row.trigger,
    status: row.status,
    localDate: row.localDate,
    igUserId: row.igUserId,
    cursor: row.cursor,
    pagesFetched: row.pagesFetched,
    followersCollected: row.followersCollected,
    invocations: row.invocations,
    lostCount: row.lostCount,
    gainedCount: row.gainedCount,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    startedAt: row.startedAt,
    updatedAt: row.updatedAt,
    finishedAt: row.finishedAt,
  };
}
