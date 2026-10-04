import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThanOrEqual, type Repository } from "typeorm";
import type {
  ListSubscriptionsFilters,
  RecordCancellationInput,
  SubscriptionChanges,
  SubscriptionRepositoryPort,
  SubscriptionStats,
  SubscriptionView,
} from "@/modules/billing/application/ports/subscription-repository.port";
import { BillingCycle } from "@/modules/billing/domain/enums/billing-cycle.enum";
import { SubscriptionStatus } from "@/modules/billing/domain/enums/subscription-status.enum";
import { SubscriptionCancellationOrmEntity } from "@/modules/billing/infrastructure/persistence/typeorm/entities/subscription-cancellation.orm-entity";
import { paginate, type Paginated } from "@/shared/application/pagination";
import { SubscriptionOrmEntity } from "@/modules/billing/infrastructure/persistence/typeorm/entities/subscription.orm-entity";

@Injectable()
export class SubscriptionTypeormRepository implements SubscriptionRepositoryPort {
  constructor(
    @InjectRepository(SubscriptionOrmEntity)
    private readonly repository: Repository<SubscriptionOrmEntity>,
    @InjectRepository(SubscriptionCancellationOrmEntity)
    private readonly cancellations: Repository<SubscriptionCancellationOrmEntity>,
  ) {}

  async findByUserId(userId: string): Promise<SubscriptionView | null> {
    const row = await this.repository.findOneBy({ userId });
    return row ? toView(row) : null;
  }

  async findByGatewaySubscriptionId(
    id: string,
  ): Promise<SubscriptionView | null> {
    const row = await this.repository.findOneBy({ gatewaySubscriptionId: id });
    return row ? toView(row) : null;
  }

  async findByGatewayPixAuthorizationId(
    id: string,
  ): Promise<SubscriptionView | null> {
    const row = await this.repository.findOneBy({
      gatewayPixAuthorizationId: id,
    });
    return row ? toView(row) : null;
  }

  async save(
    userId: string,
    changes: SubscriptionChanges,
  ): Promise<SubscriptionView> {
    const row =
      (await this.repository.findOneBy({ userId })) ??
      this.repository.create({ userId });
    Object.assign(row, changes);
    return toView(await this.repository.save(row));
  }

  async findPastDueSince(before: Date): Promise<SubscriptionView[]> {
    const rows = await this.repository.findBy({
      status: SubscriptionStatus.PAST_DUE,
      pastDueSince: LessThanOrEqual(before),
    });
    return rows.map(toView);
  }

  async findEndedCancellations(now: Date): Promise<SubscriptionView[]> {
    const rows = await this.repository.findBy({
      cancelAtPeriodEnd: true,
      currentPeriodEnd: LessThanOrEqual(now),
    });
    return rows.map(toView);
  }

  async stats(): Promise<SubscriptionStats> {
    const rows = await this.repository
      .createQueryBuilder("s")
      .select("s.status", "status")
      .addSelect("s.billing_cycle", "cycle")
      .addSelect("COUNT(*)::int", "count")
      .groupBy("s.status")
      .addGroupBy("s.billing_cycle")
      .getRawMany<{
        status: SubscriptionStatus;
        cycle: BillingCycle | null;
        count: number;
      }>();

    const byStatus = Object.fromEntries(
      Object.values(SubscriptionStatus).map((status) => [status, 0]),
    ) as Record<SubscriptionStatus, number>;
    const activeByCycle = Object.fromEntries(
      Object.values(BillingCycle).map((cycle) => [cycle, 0]),
    ) as Record<BillingCycle, number>;
    for (const row of rows) {
      byStatus[row.status] += Number(row.count);
      if (row.status === SubscriptionStatus.ACTIVE && row.cycle) {
        activeByCycle[row.cycle] += Number(row.count);
      }
    }
    return { byStatus, activeByCycle };
  }

  async list(
    filters: ListSubscriptionsFilters,
  ): Promise<Paginated<SubscriptionView>> {
    const [rows, total] = await this.repository.findAndCount({
      where: filters.status ? { status: filters.status } : {},
      order: { updatedAt: "DESC" },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    });
    return paginate(rows.map(toView), total, filters);
  }

  async recordCancellation(input: RecordCancellationInput): Promise<void> {
    await this.cancellations.save(this.cancellations.create(input));
  }
}

function toView(row: SubscriptionOrmEntity): SubscriptionView {
  return {
    id: row.id,
    userId: row.userId,
    status: row.status,
    billingCycle: row.billingCycle ?? null,
    paymentMethod: row.paymentMethod ?? null,
    proStartedAt: row.proStartedAt ?? null,
    currentPeriodEnd: row.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd ?? false,
    gatewayCustomerId: row.gatewayCustomerId ?? null,
    gatewaySubscriptionId: row.gatewaySubscriptionId ?? null,
    gatewayPixAuthorizationId: row.gatewayPixAuthorizationId ?? null,
    pastDueSince: row.pastDueSince ?? null,
  };
}
