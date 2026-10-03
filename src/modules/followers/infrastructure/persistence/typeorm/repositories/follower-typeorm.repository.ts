import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, type EntityManager, In, IsNull } from "typeorm";
import type {
  FollowerCounts,
  FollowerEventView,
  FollowerFilterOption,
  FollowerRepositoryPort,
  FollowerView,
  ListFollowerEventsFilters,
  ListFollowersFilters,
  SnapshotChangeSet,
} from "@/modules/followers/application/ports/follower-repository.port";
import type { FollowerEventType } from "@/modules/followers/domain/enums/follower-event-type.enum";
import { FollowerStatus } from "@/modules/followers/domain/enums/follower-status.enum";
import type { KnownFollower } from "@/modules/followers/domain/types/follower.types";
import { FollowerEventOrmEntity } from "@/modules/followers/infrastructure/persistence/typeorm/entities/follower-event.orm-entity";
import { FollowerOrmEntity } from "@/modules/followers/infrastructure/persistence/typeorm/entities/follower.orm-entity";
import { paginate, type Paginated } from "@/shared/application/pagination";

const CHUNK_SIZE = 500;

function likePattern(text: string): string {
  return `%${text.replace(/[%_\\]/g, "\\$&")}%`;
}

function chunk<T>(items: T[], size = CHUNK_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

@Injectable()
export class FollowerTypeormRepository implements FollowerRepositoryPort {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get followers() {
    return this.dataSource.getRepository(FollowerOrmEntity);
  }

  private get events() {
    return this.dataSource.getRepository(FollowerEventOrmEntity);
  }

  async findAllKnown(userId: string): Promise<KnownFollower[]> {
    return this.followers.find({
      where: { userId },
      select: { username: true, status: true },
    });
  }

  async applyChangeSet(
    userId: string,
    changes: SnapshotChangeSet,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await this.upsertCurrent(manager, userId, changes);
      await this.markLost(manager, userId, changes);
      for (const batch of chunk(changes.events)) {
        await manager.insert(
          FollowerEventOrmEntity,
          batch.map((event) => ({
            userId,
            username: event.username,
            type: event.type,
            importId: event.importId,
            occurredAt: changes.observedAt,
            notifiedAt: null,
          })),
        );
      }
    });
  }

  private async upsertCurrent(
    manager: EntityManager,
    userId: string,
    changes: SnapshotChangeSet,
  ): Promise<void> {
    for (const batch of chunk(changes.current)) {
      await manager
        .createQueryBuilder()
        .insert()
        .into(FollowerOrmEntity)
        .values(
          batch.map((entry) => ({
            userId,
            username: entry.username.slice(0, 64),
            status: FollowerStatus.ACTIVE,
            followedAt: entry.followedAt,
            firstSeenAt: changes.observedAt,
            lastSeenAt: changes.observedAt,
            lostAt: null,
          })),
        )
        // first_seen_at is left out: it keeps the original date.
        .orUpdate(
          ["status", "followed_at", "last_seen_at", "lost_at"],
          ["idtb_users", "username"],
        )
        .execute();
    }
  }

  private async markLost(
    manager: EntityManager,
    userId: string,
    changes: SnapshotChangeSet,
  ): Promise<void> {
    for (const batch of chunk(changes.lostUsernames)) {
      await manager.update(
        FollowerOrmEntity,
        { userId, username: In(batch) },
        { status: FollowerStatus.LOST, lostAt: changes.observedAt },
      );
    }
  }

  async countByStatus(userId: string): Promise<FollowerCounts> {
    const rows = await this.followers
      .createQueryBuilder("f")
      .select("f.status", "status")
      .addSelect("COUNT(*)::int", "count")
      .where("f.idtb_users = :userId", { userId })
      .groupBy("f.status")
      .getRawMany<{ status: FollowerStatus; count: number }>();

    const byStatus = new Map(
      rows.map((row) => [row.status, Number(row.count)]),
    );
    return {
      active: byStatus.get(FollowerStatus.ACTIVE) ?? 0,
      lost: byStatus.get(FollowerStatus.LOST) ?? 0,
    };
  }

  countEventsSince(
    userId: string,
    type: FollowerEventType,
    since: Date,
  ): Promise<number> {
    return this.events
      .createQueryBuilder("e")
      .where("e.idtb_users = :userId", { userId })
      .andWhere("e.type = :type", { type })
      .andWhere("e.occurred_at >= :since", { since })
      .getCount();
  }

  async list(
    userId: string,
    filters: ListFollowersFilters,
  ): Promise<Paginated<FollowerView>> {
    const query = this.followers
      .createQueryBuilder("f")
      .where("f.idtb_users = :userId", { userId });

    if (filters.status) {
      query.andWhere("f.status = :status", { status: filters.status });
    }
    if (filters.search) {
      query.andWhere("f.username ILIKE :search", {
        search: likePattern(filters.search),
      });
    }
    if (filters.username) {
      query.andWhere("f.username = :username", { username: filters.username });
    }

    const [rows, total] = await query
      .orderBy(
        filters.status === FollowerStatus.LOST ? "f.lostAt" : "f.firstSeenAt",
        "DESC",
      )
      .addOrderBy("f.username", "ASC")
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit)
      .getManyAndCount();

    return paginate(rows.map(toFollowerView), total, filters);
  }

  async listEvents(
    userId: string,
    filters: ListFollowerEventsFilters,
  ): Promise<Paginated<FollowerEventView>> {
    const query = this.events
      .createQueryBuilder("e")
      .where("e.idtb_users = :userId", { userId });
    if (filters.type) {
      query.andWhere("e.type = :type", { type: filters.type });
    }
    if (filters.username) {
      query.andWhere("e.username = :username", { username: filters.username });
    }

    const [rows, total] = await query
      .orderBy("e.occurred_at", "DESC")
      .addOrderBy("e.username", "ASC")
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit)
      .getManyAndCount();

    return paginate(rows.map(toEventView), total, filters);
  }

  async listFilterOptions(
    userId: string,
    criteria: { status?: FollowerStatus; search?: string; limit: number },
  ): Promise<FollowerFilterOption[]> {
    const query = this.followers
      .createQueryBuilder("f")
      .select('f.username AS "username"')
      .where("f.idtb_users = :userId", { userId });
    if (criteria.status) {
      query.andWhere("f.status = :status", { status: criteria.status });
    }
    if (criteria.search) {
      query.andWhere("f.username ILIKE :search", {
        search: likePattern(criteria.search),
      });
    }
    return query
      .orderBy("f.username", "ASC")
      .limit(criteria.limit)
      .getRawMany<FollowerFilterOption>();
  }

  async listEventFilterOptions(
    userId: string,
    criteria: { type?: FollowerEventType; search?: string; limit: number },
  ): Promise<FollowerFilterOption[]> {
    const query = this.events
      .createQueryBuilder("e")
      .select("e.username", "username")
      .distinct(true)
      .where("e.idtb_users = :userId", { userId });
    if (criteria.type) {
      query.andWhere("e.type = :type", { type: criteria.type });
    }
    if (criteria.search) {
      query.andWhere("e.username ILIKE :search", {
        search: likePattern(criteria.search),
      });
    }
    return query
      .orderBy("e.username", "ASC")
      .limit(criteria.limit)
      .getRawMany<FollowerFilterOption>();
  }

  existsByUsername(userId: string, username: string): Promise<boolean> {
    return this.followers.existsBy({ userId, username });
  }

  async findUnnotifiedEvents(
    userId: string,
    type: FollowerEventType,
  ): Promise<FollowerEventView[]> {
    const rows = await this.events.find({
      where: { userId, type, notifiedAt: IsNull() },
      order: { occurredAt: "ASC" },
      take: 500,
    });
    return rows.map(toEventView);
  }

  async markEventsNotified(
    userId: string,
    ids: string[],
    at: Date,
  ): Promise<void> {
    for (const batch of chunk(ids)) {
      await this.events.update(
        { userId, id: In(batch), notifiedAt: IsNull() },
        { notifiedAt: at },
      );
    }
  }
}

function toEventView(row: FollowerEventOrmEntity): FollowerEventView {
  return {
    id: row.id,
    username: row.username,
    type: row.type,
    importId: row.importId,
    occurredAt: row.occurredAt,
    notifiedAt: row.notifiedAt,
  };
}

function toFollowerView(row: FollowerOrmEntity): FollowerView {
  return {
    username: row.username,
    status: row.status,
    followedAt: row.followedAt,
    firstSeenAt: row.firstSeenAt,
    lastSeenAt: row.lastSeenAt,
    lostAt: row.lostAt,
  };
}
