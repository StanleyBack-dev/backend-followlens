import type { BillingCycle } from "@/modules/billing/domain/enums/billing-cycle.enum";
import type { CancellationReason } from "@/modules/billing/domain/enums/cancellation-reason.enum";
import type { PaymentMethod } from "@/modules/billing/domain/enums/payment-method.enum";
import type { SubscriptionStatus } from "@/modules/billing/domain/enums/subscription-status.enum";
import type { PageRequest, Paginated } from "@/shared/application/pagination";

export type SubscriptionView = {
  id: string;
  userId: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle | null;
  paymentMethod: PaymentMethod | null;
  proStartedAt: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  gatewayCustomerId: string | null;
  gatewaySubscriptionId: string | null;
  gatewayPixAuthorizationId: string | null;
  pastDueSince: Date | null;
};

export type SubscriptionChanges = Partial<
  Omit<SubscriptionView, "id" | "userId">
>;

export type RecordCancellationInput = {
  userId: string;
  email: string;
  reasons: CancellationReason[];
  otherReason: string | null;
  billingCycle: BillingCycle | null;
  proStartedAt: Date | null;
  requestedAt: Date;
  effectiveAt: Date;
};

export type SubscriptionStats = {
  byStatus: Record<SubscriptionStatus, number>;
  /** ACTIVE subscriptions per billing cycle (what recurring revenue is made of). */
  activeByCycle: Record<BillingCycle, number>;
};

export type ListSubscriptionsFilters = PageRequest & {
  status?: SubscriptionStatus;
};

export interface SubscriptionRepositoryPort {
  findByUserId(userId: string): Promise<SubscriptionView | null>;
  findByGatewaySubscriptionId(id: string): Promise<SubscriptionView | null>;
  findByGatewayPixAuthorizationId(id: string): Promise<SubscriptionView | null>;
  /** Creates the user's row on first use, then applies the changes. */
  save(userId: string, changes: SubscriptionChanges): Promise<SubscriptionView>;
  /** PAST_DUE since `before` or earlier. */
  findPastDueSince(before: Date): Promise<SubscriptionView[]>;
  /** Canceled by the user and whose paid period has ended by `now`. */
  findEndedCancellations(now: Date): Promise<SubscriptionView[]>;
  recordCancellation(input: RecordCancellationInput): Promise<void>;

  // === admin ===
  stats(): Promise<SubscriptionStats>;
  /** Most recently changed first. */
  list(filters: ListSubscriptionsFilters): Promise<Paginated<SubscriptionView>>;
}

export const SUBSCRIPTION_REPOSITORY = Symbol("SUBSCRIPTION_REPOSITORY");
