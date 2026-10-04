import { Inject, Injectable } from "@nestjs/common";
import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";
import {
  PAYMENT_GATEWAY,
  type PaymentGatewayPort,
} from "@/modules/billing/application/ports/payment-gateway.port";
import {
  SUBSCRIPTION_REPOSITORY,
  type SubscriptionRepositoryPort,
} from "@/modules/billing/application/ports/subscription-repository.port";
import { SubscriptionPlanService } from "@/modules/billing/application/subscription-plan.service";
import type { CancellationReason } from "@/modules/billing/domain/enums/cancellation-reason.enum";
import { SubscriptionStatus } from "@/modules/billing/domain/enums/subscription-status.enum";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

export type CancelSubscriptionCommand = {
  reasons: CancellationReason[];
  otherReason?: string;
};

// The user keeps Pro until the end of the period already paid for; the
// gateway is told right away to stop generating new charges.
@Injectable()
export class CancelSubscriptionUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptions: SubscriptionRepositoryPort,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGatewayPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly plan: SubscriptionPlanService,
  ) {}

  async execute(
    user: { id: string; email: string },
    command: CancelSubscriptionCommand,
  ): Promise<void> {
    const subscription = await this.subscriptions.findByUserId(user.id);
    const cancellable =
      subscription &&
      !subscription.cancelAtPeriodEnd &&
      (subscription.status === SubscriptionStatus.ACTIVE ||
        subscription.status === SubscriptionStatus.PAST_DUE);
    if (!cancellable) {
      throw AppException.from(
        APP_ERRORS.billing.noActiveSubscription,
        undefined,
      );
    }

    if (subscription.gatewaySubscriptionId) {
      await this.gateway.cancelSubscription(subscription.gatewaySubscriptionId);
    }
    if (subscription.gatewayPixAuthorizationId) {
      await this.gateway.cancelPixAutomaticAuthorization(
        subscription.gatewayPixAuthorizationId,
      );
    }

    const now = this.clock.now();
    const paidUntil = subscription.currentPeriodEnd;
    await this.subscriptions.recordCancellation({
      userId: user.id,
      email: user.email,
      reasons: command.reasons,
      otherReason: command.otherReason?.trim() || null,
      billingCycle: subscription.billingCycle,
      proStartedAt: subscription.proStartedAt,
      requestedAt: now,
      effectiveAt: paidUntil && paidUntil > now ? paidUntil : now,
    });
    await this.plan.stopRenewing(subscription);
  }
}
