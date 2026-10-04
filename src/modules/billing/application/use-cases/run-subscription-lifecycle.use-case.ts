import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  BILLING_SETTINGS,
  type BillingSettings,
} from "@/modules/billing/application/billing.config";
import {
  PAYMENT_GATEWAY,
  type PaymentGatewayPort,
} from "@/modules/billing/application/ports/payment-gateway.port";
import {
  SUBSCRIPTION_REPOSITORY,
  type SubscriptionRepositoryPort,
  type SubscriptionView,
} from "@/modules/billing/application/ports/subscription-repository.port";
import { SubscriptionPlanService } from "@/modules/billing/application/subscription-plan.service";
import { SubscriptionStatus } from "@/modules/billing/domain/enums/subscription-status.enum";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

const DAY_MS = 86_400_000;

export type SubscriptionLifecycleOutcome = { downgraded: number };

// Daily job: sends back to Free the subscriptions that stayed overdue past the
// grace period and the canceled ones whose paid period has ended.
@Injectable()
export class RunSubscriptionLifecycleUseCase {
  private readonly logger = new Logger(RunSubscriptionLifecycleUseCase.name);

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptions: SubscriptionRepositoryPort,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGatewayPort,
    @Inject(BILLING_SETTINGS) private readonly settings: BillingSettings,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly plan: SubscriptionPlanService,
  ) {}

  async execute(): Promise<SubscriptionLifecycleOutcome> {
    const now = this.clock.now();
    const overdue = await this.subscriptions.findPastDueSince(
      new Date(now.getTime() - this.settings.pastDueGraceDays * DAY_MS),
    );
    for (const subscription of overdue) {
      // Otherwise the gateway keeps generating charges nobody will pay.
      await this.stopAtGateway(subscription);
      await this.plan.end(subscription, SubscriptionStatus.EXPIRED);
    }

    const ended = await this.subscriptions.findEndedCancellations(now);
    for (const subscription of ended) {
      await this.plan.end(subscription, SubscriptionStatus.CANCELED);
    }

    const downgraded = overdue.length + ended.length;
    if (downgraded > 0) {
      this.logger.log(`${downgraded} assinatura(s) rebaixada(s) para Free.`);
    }
    return { downgraded };
  }

  private async stopAtGateway(subscription: SubscriptionView): Promise<void> {
    try {
      if (subscription.gatewaySubscriptionId) {
        await this.gateway.cancelSubscription(
          subscription.gatewaySubscriptionId,
        );
      }
      if (subscription.gatewayPixAuthorizationId) {
        await this.gateway.cancelPixAutomaticAuthorization(
          subscription.gatewayPixAuthorizationId,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Não foi possível encerrar a cobrança do usuário ${subscription.userId} no gateway: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
