import { Inject, Injectable } from "@nestjs/common";
import {
  BILLING_SETTINGS,
  type BillingSettings,
} from "@/modules/billing/application/billing.config";
import {
  type ListSubscriptionsFilters,
  SUBSCRIPTION_REPOSITORY,
  type SubscriptionRepositoryPort,
} from "@/modules/billing/application/ports/subscription-repository.port";
import { BillingCycle } from "@/modules/billing/domain/enums/billing-cycle.enum";
import type { PaymentMethod } from "@/modules/billing/domain/enums/payment-method.enum";
import { SubscriptionStatus } from "@/modules/billing/domain/enums/subscription-status.enum";
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from "@/modules/users/application/ports/user-repository.port";
import type { Paginated } from "@/shared/application/pagination";

export type SubscriptionsOverview = {
  byStatus: Record<SubscriptionStatus, number>;
  /** Subscriptions currently paying for Pro. */
  activePro: number;
  /** Estimated monthly recurring revenue, in BRL, from the active ones. */
  monthlyRecurringRevenue: number;
};

export type AdminSubscriptionRow = {
  id: string;
  userName: string;
  userEmail: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle | null;
  paymentMethod: PaymentMethod | null;
  /** Price of the subscription's cycle today, or null without a cycle. */
  price: number | null;
  proStartedAt: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  pastDueSince: Date | null;
};

// Read-only view of the paid subscriptions for the admin area.
@Injectable()
export class AdminSubscriptionsQuery {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptions: SubscriptionRepositoryPort,
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(BILLING_SETTINGS) private readonly settings: BillingSettings,
  ) {}

  async overview(): Promise<SubscriptionsOverview> {
    const { byStatus, activeByCycle } = await this.subscriptions.stats();
    const { prices } = this.settings;
    const revenue =
      activeByCycle[BillingCycle.MONTHLY] * prices[BillingCycle.MONTHLY] +
      (activeByCycle[BillingCycle.YEARLY] * prices[BillingCycle.YEARLY]) / 12;
    return {
      byStatus,
      activePro: byStatus[SubscriptionStatus.ACTIVE],
      monthlyRecurringRevenue: Math.round(revenue * 100) / 100,
    };
  }

  async list(
    filters: ListSubscriptionsFilters,
  ): Promise<Paginated<AdminSubscriptionRow>> {
    const page = await this.subscriptions.list(filters);
    const people = new Map(
      (await this.users.findByIds(page.items.map((item) => item.userId))).map(
        (user) => [user.id, user],
      ),
    );
    return {
      ...page,
      items: page.items.map((item) => ({
        id: item.id,
        userName: people.get(item.userId)?.name ?? "—",
        userEmail: people.get(item.userId)?.email ?? "—",
        status: item.status,
        billingCycle: item.billingCycle,
        paymentMethod: item.paymentMethod,
        price: item.billingCycle
          ? this.settings.prices[item.billingCycle]
          : null,
        proStartedAt: item.proStartedAt,
        currentPeriodEnd: item.currentPeriodEnd,
        cancelAtPeriodEnd: item.cancelAtPeriodEnd,
        pastDueSince: item.pastDueSince,
      })),
    };
  }
}
