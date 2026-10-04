import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import type {
  BillingPaymentRepositoryPort,
  BillingPaymentView,
  UpsertBillingPaymentInput,
} from "@/modules/billing/application/ports/billing-payment-repository.port";
import { BillingPaymentOrmEntity } from "@/modules/billing/infrastructure/persistence/typeorm/entities/billing-payment.orm-entity";
import {
  paginate,
  type PageRequest,
  type Paginated,
} from "@/shared/application/pagination";

@Injectable()
export class BillingPaymentTypeormRepository implements BillingPaymentRepositoryPort {
  constructor(
    @InjectRepository(BillingPaymentOrmEntity)
    private readonly repository: Repository<BillingPaymentOrmEntity>,
  ) {}

  async upsertByGatewayPaymentId(
    input: UpsertBillingPaymentInput,
  ): Promise<void> {
    const row =
      (await this.repository.findOneBy({
        gatewayPaymentId: input.gatewayPaymentId,
      })) ??
      this.repository.create({
        userId: input.userId,
        gatewayPaymentId: input.gatewayPaymentId,
      });

    row.amount = input.amount.toFixed(2);
    row.status = input.status;
    row.dueDate = input.dueDate;
    row.invoiceUrl = input.invoiceUrl ?? row.invoiceUrl ?? null;
    if (input.paidAt) row.paidAt = input.paidAt;
    await this.repository.save(row);
  }

  async list(
    userId: string,
    request: PageRequest,
  ): Promise<Paginated<BillingPaymentView>> {
    const [rows, total] = await this.repository.findAndCount({
      where: { userId },
      order: { createdAt: "DESC" },
      skip: (request.page - 1) * request.limit,
      take: request.limit,
    });
    return paginate(rows.map(toView), total, request);
  }
}

function toView(row: BillingPaymentOrmEntity): BillingPaymentView {
  return {
    id: row.id,
    amount: Number(row.amount),
    status: row.status,
    dueDate: row.dueDate,
    paidAt: row.paidAt,
    invoiceUrl: row.invoiceUrl,
    createdAt: row.createdAt,
  };
}
