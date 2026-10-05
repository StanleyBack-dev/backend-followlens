import { Inject, Injectable } from "@nestjs/common";
import {
  BILLING_SETTINGS,
  type BillingSettings,
} from "@/modules/billing/application/billing.config";
import {
  SUBSCRIPTION_REPOSITORY,
  type SubscriptionRepositoryPort,
} from "@/modules/billing/application/ports/subscription-repository.port";
import type { BillingCycle } from "@/modules/billing/domain/enums/billing-cycle.enum";
import type { PaymentMethod } from "@/modules/billing/domain/enums/payment-method.enum";
import { SubscriptionStatus } from "@/modules/billing/domain/enums/subscription-status.enum";
import { UserPlan } from "@/modules/users/domain/enums/user-plan.enum";
import {
  hasProAccess,
  type PlanHolder,
} from "@/modules/users/domain/plan-access";
import {
  PLAN_LIMITS,
  type PlanLimits,
} from "@/shared/application/plan-limits.config";

/** Why the user has Pro access, when they do. */
export type ProSource = "subscription" | "courtesy" | "admin" | "bonus";

export type SubscriptionSummary = {
  hasProAccess: boolean;
  proSource: ProSource | null;
  /** End of a time-limited Pro earned by referrals, when one is running. */
  proBonusUntil: Date | null;
  /** The paid subscription, when one was ever started. */
  subscription: {
    status: SubscriptionStatus;
    billingCycle: BillingCycle | null;
    paymentMethod: PaymentMethod | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    pastDueSince: Date | null;
  } | null;
  prices: Record<BillingCycle, number>;
  pastDueGraceDays: number;
  pixAutomaticEnabled: boolean;
  freeLimits: PlanLimits;
};

@Injectable()
export class GetMySubscriptionUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptions: SubscriptionRepositoryPort,
    @Inject(BILLING_SETTINGS) private readonly settings: BillingSettings,
    @Inject(PLAN_LIMITS) private readonly limits: PlanLimits,
  ) {}

  async execute(
    user: PlanHolder & { id: string; proBonusUntil?: Date | null },
  ): Promise<SubscriptionSummary> {
    const subscription = await this.subscriptions.findByUserId(user.id);
    const paying =
      subscription?.status === SubscriptionStatus.ACTIVE ||
      subscription?.status === SubscriptionStatus.PAST_DUE;
    const pro = hasProAccess(user);

    return {
      hasProAccess: pro,
      proSource: !pro
        ? null
        : paying
          ? "subscription"
          : user.isAdmin
            ? "admin"
            : user.plan === (UserPlan.PRO as string)
              ? "courtesy"
              : "bonus",
      proBonusUntil: user.proBonusActive ? (user.proBonusUntil ?? null) : null,
      subscription: subscription
        ? {
            status: subscription.status,
            billingCycle: subscription.billingCycle,
            paymentMethod: subscription.paymentMethod,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            pastDueSince: subscription.pastDueSince,
          }
        : null,
      prices: this.settings.prices,
      pastDueGraceDays: this.settings.pastDueGraceDays,
      pixAutomaticEnabled: this.settings.pixAutomaticEnabled,
      freeLimits: this.limits,
    };
  }
}
