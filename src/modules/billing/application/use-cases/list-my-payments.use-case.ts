import { Inject, Injectable } from "@nestjs/common";
import {
  BILLING_PAYMENT_REPOSITORY,
  type BillingPaymentRepositoryPort,
  type BillingPaymentView,
} from "@/modules/billing/application/ports/billing-payment-repository.port";
import type { PageRequest, Paginated } from "@/shared/application/pagination";

@Injectable()
export class ListMyPaymentsUseCase {
  constructor(
    @Inject(BILLING_PAYMENT_REPOSITORY)
    private readonly payments: BillingPaymentRepositoryPort,
  ) {}

  execute(
    userId: string,
    request: PageRequest,
  ): Promise<Paginated<BillingPaymentView>> {
    return this.payments.list(userId, request);
  }
}
