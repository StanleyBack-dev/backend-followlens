import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThanOrEqual, type Repository } from "typeorm";
import type {
  RecordCancellationInput,
  SubscriptionChanges,
  SubscriptionRepositoryPort,
  SubscriptionView,
} from "@/modules/billing/application/ports/subscription-repository.port";
import { SubscriptionStatus } from "@/modules/billing/domain/enums/subscription-status.enum";
import { SubscriptionCancellationOrmEntity } from "@/modules/billing/infrastructure/persistence/typeorm/entities/subscription-cancellation.orm-entity";
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
