import type { BillingPaymentStatus } from "@/modules/billing/domain/enums/billing-payment-status.enum";
import type { PageRequest, Paginated } from "@/shared/application/pagination";

export type BillingPaymentView = {
  id: string;
  amount: number;
  status: BillingPaymentStatus;
  dueDate: string | null;
  paidAt: Date | null;
  invoiceUrl: string | null;
  createdAt: Date;
};

export type UpsertBillingPaymentInput = {
  userId: string;
  gatewayPaymentId: string;
  amount: number;
  status: BillingPaymentStatus;
  dueDate: string | null;
  /** Only set when the event settles the charge; never cleared. */
  paidAt?: Date;
  invoiceUrl: string | null;
};

export interface BillingPaymentRepositoryPort {
  /** Idempotent on the gateway payment id (webhooks are delivered repeatedly). */
  upsertByGatewayPaymentId(input: UpsertBillingPaymentInput): Promise<void>;
  list(
    userId: string,
    request: PageRequest,
  ): Promise<Paginated<BillingPaymentView>>;
}

export const BILLING_PAYMENT_REPOSITORY = Symbol("BILLING_PAYMENT_REPOSITORY");
