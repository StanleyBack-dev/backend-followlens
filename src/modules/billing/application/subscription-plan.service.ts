import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  BILLING_SETTINGS,
  type BillingSettings,
} from "@/modules/billing/application/billing.config";
import {
  SUBSCRIPTION_REPOSITORY,
  type SubscriptionRepositoryPort,
  type SubscriptionView,
} from "@/modules/billing/application/ports/subscription-repository.port";
import { BillingCycle } from "@/modules/billing/domain/enums/billing-cycle.enum";
import { ReferralRewardCoordinator } from "@/modules/billing/application/referral-reward.coordinator";
import { SubscriptionStatus } from "@/modules/billing/domain/enums/subscription-status.enum";
import { SendBillingEmailsUseCase } from "@/modules/mails/application/use-cases/send-billing-emails.use-case";
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from "@/modules/users/application/ports/user-repository.port";
import { UserPlan } from "@/modules/users/domain/enums/user-plan.enum";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

// The only place that moves a subscription between states and keeps the
// user's effective plan (tb_users.plan) in step with it.
@Injectable()
export class SubscriptionPlanService {
  private readonly logger = new Logger(SubscriptionPlanService.name);

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptions: SubscriptionRepositoryPort,
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(BILLING_SETTINGS) private readonly settings: BillingSettings,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly emails: SendBillingEmailsUseCase,
    private readonly referralRewards: ReferralRewardCoordinator,
  ) {}

  /** A charge settled: grant (or renew) Pro up to one cycle past `paidFor`. */
  async activate(subscription: SubscriptionView, paidFor: Date): Promise<void> {
    const hadPro =
      subscription.status === SubscriptionStatus.ACTIVE ||
      subscription.status === SubscriptionStatus.PAST_DUE;
    const currentPeriodEnd = nextPeriodEnd(subscription.billingCycle, paidFor);

    await this.subscriptions.save(subscription.userId, {
      status: SubscriptionStatus.ACTIVE,
      pastDueSince: null,
      cancelAtPeriodEnd: false,
      currentPeriodEnd,
      proStartedAt: subscription.proStartedAt ?? this.clock.now(),
    });
    await this.users.updateAccess(subscription.userId, { plan: UserPlan.PRO });

    // Renewals and repeated webhooks stay silent.
    if (hadPro) return;
    await this.notify(subscription.userId, (user) =>
      this.emails.subscriptionActivated({
        to: user.email,
        name: user.name,
        yearly: subscription.billingCycle === BillingCycle.YEARLY,
        renewsOn: currentPeriodEnd,
      }),
    );
    // A first-ever payment is what earns whoever invited this user a reward.
    if (subscription.proStartedAt === null) {
      await this.referralRewards.onFirstPayment(subscription.userId);
    }
  }

  /** The payment was refunded: Pro goes, and so does the referral reward. */
  async refund(subscription: SubscriptionView): Promise<void> {
    await this.end(subscription, SubscriptionStatus.CANCELED);
    await this.referralRewards.onRefund(subscription.userId);
  }

  /** A charge is overdue: Pro is kept during the grace period. */
  async markPastDue(subscription: SubscriptionView): Promise<void> {
    if (
      subscription.status !== SubscriptionStatus.ACTIVE ||
      subscription.pastDueSince
    ) {
      return;
    }
    await this.subscriptions.save(subscription.userId, {
      status: SubscriptionStatus.PAST_DUE,
      pastDueSince: this.clock.now(),
    });
    await this.notify(subscription.userId, (user) =>
      this.emails.paymentOverdue({
        to: user.email,
        name: user.name,
        graceDays: this.settings.pastDueGraceDays,
      }),
    );
  }

  /** Ends the subscription right away and sends the user back to Free. */
  async end(
    subscription: SubscriptionView,
    status: SubscriptionStatus.CANCELED | SubscriptionStatus.EXPIRED,
  ): Promise<void> {
    const hadPro =
      subscription.status === SubscriptionStatus.ACTIVE ||
      subscription.status === SubscriptionStatus.PAST_DUE;
    await this.subscriptions.save(subscription.userId, {
      status,
      cancelAtPeriodEnd: false,
      pastDueSince: null,
    });
    // A checkout that never got paid never granted Pro: leave the plan alone
    // (it may be a Pro granted by an admin).
    if (hadPro) {
      await this.users.updateAccess(subscription.userId, {
        plan: UserPlan.FREE,
      });
    }
  }

  /**
   * The gateway stopped renewing (canceled there, or by the user here): keep
   * Pro until the period already paid for ends, then the lifecycle job ends it.
   */
  async stopRenewing(subscription: SubscriptionView): Promise<void> {
    const paidUntil = subscription.currentPeriodEnd;
    if (
      subscription.status === SubscriptionStatus.ACTIVE &&
      paidUntil &&
      paidUntil > this.clock.now()
    ) {
      await this.subscriptions.save(subscription.userId, {
        cancelAtPeriodEnd: true,
      });
      return;
    }
    await this.end(subscription, SubscriptionStatus.CANCELED);
  }

  // Best-effort: a mail outage must never fail a webhook or a state change.
  private async notify(
    userId: string,
    send: (user: { email: string; name: string }) => Promise<void>,
  ): Promise<void> {
    try {
      const user = await this.users.findById(userId);
      if (user) await send(user);
    } catch (error) {
      this.logger.warn(
        `Falha ao enviar e-mail de assinatura para o usuário ${userId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

/** The paid period runs from the charge's due date for one billing cycle. */
export function nextPeriodEnd(cycle: BillingCycle | null, from: Date): Date {
  const end = new Date(from);
  if (cycle === BillingCycle.YEARLY) {
    end.setUTCFullYear(end.getUTCFullYear() + 1);
  } else {
    end.setUTCMonth(end.getUTCMonth() + 1);
  }
  return end;
}
