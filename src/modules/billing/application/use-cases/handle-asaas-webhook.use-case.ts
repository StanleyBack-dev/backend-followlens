import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";
import { safeCompare } from "@/common/security/safe-compare";
import {
  BILLING_PAYMENT_REPOSITORY,
  type BillingPaymentRepositoryPort,
} from "@/modules/billing/application/ports/billing-payment-repository.port";
import {
  SUBSCRIPTION_REPOSITORY,
  type SubscriptionRepositoryPort,
  type SubscriptionView,
} from "@/modules/billing/application/ports/subscription-repository.port";
import { SubscriptionPlanService } from "@/modules/billing/application/subscription-plan.service";
import { BillingPaymentStatus } from "@/modules/billing/domain/enums/billing-payment-status.enum";
import { SubscriptionStatus } from "@/modules/billing/domain/enums/subscription-status.enum";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

export type AsaasWebhookPayment = {
  id: string;
  subscription?: string;
  /** Set on charges generated under a Pix Automático authorization. */
  pixAutomaticAuthorizationId?: string;
  value: number;
  status: string;
  dueDate?: string;
  invoiceUrl?: string;
};

export type AsaasWebhookPayload = {
  event: string;
  payment?: AsaasWebhookPayment;
  subscription?: { id: string };
  /** Authorization events carry the id as a bare string. */
  pixAutomaticAuthorization?: string;
};

const SETTLED_EVENTS = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
const SUBSCRIPTION_STOPPED_EVENTS = new Set([
  "SUBSCRIPTION_DELETED",
  "SUBSCRIPTION_INACTIVATED",
]);
const PIX_AUTHORIZATION_ACTIVATED =
  "PIX_AUTOMATIC_RECURRING_AUTHORIZATION_ACTIVATED";
const PIX_AUTHORIZATION_STOPPED_EVENTS = new Set([
  "PIX_AUTOMATIC_RECURRING_AUTHORIZATION_CANCELLED",
  "PIX_AUTOMATIC_RECURRING_AUTHORIZATION_REFUSED",
  "PIX_AUTOMATIC_RECURRING_AUTHORIZATION_EXPIRED",
]);

const PAYMENT_STATUS: Record<string, BillingPaymentStatus> = {
  CONFIRMED: BillingPaymentStatus.CONFIRMED,
  RECEIVED: BillingPaymentStatus.RECEIVED,
  RECEIVED_IN_CASH: BillingPaymentStatus.RECEIVED,
  OVERDUE: BillingPaymentStatus.OVERDUE,
  REFUNDED: BillingPaymentStatus.REFUNDED,
  DELETED: BillingPaymentStatus.DELETED,
};

// Every state change of a paid subscription arrives here. The gateway repeats
// deliveries, so each branch is safe to run more than once.
@Injectable()
export class HandleAsaasWebhookUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptions: SubscriptionRepositoryPort,
    @Inject(BILLING_PAYMENT_REPOSITORY)
    private readonly payments: BillingPaymentRepositoryPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly plan: SubscriptionPlanService,
    private readonly config: ConfigService,
  ) {}

  async execute(
    receivedToken: string | undefined,
    payload: AsaasWebhookPayload,
  ): Promise<void> {
    const expected = this.config.get<string>("ASAAS_WEBHOOK_TOKEN");
    if (!expected || !safeCompare(receivedToken ?? "", expected)) {
      throw AppException.from(
        APP_ERRORS.billing.invalidWebhookToken,
        undefined,
      );
    }

    if (payload.payment) {
      await this.onPayment(payload.event, payload.payment);
    } else if (payload.subscription) {
      await this.onSubscription(payload.event, payload.subscription.id);
    } else if (payload.pixAutomaticAuthorization) {
      await this.onPixAuthorization(
        payload.event,
        payload.pixAutomaticAuthorization,
      );
    }
  }

  private async onPayment(
    event: string,
    payment: AsaasWebhookPayment,
  ): Promise<void> {
    const subscription = payment.subscription
      ? await this.subscriptions.findByGatewaySubscriptionId(
          payment.subscription,
        )
      : payment.pixAutomaticAuthorizationId
        ? await this.subscriptions.findByGatewayPixAuthorizationId(
            payment.pixAutomaticAuthorizationId,
          )
        : null;
    // Charges of anything else in the gateway account are not ours.
    if (!subscription) return;

    const settled = SETTLED_EVENTS.has(event);
    await this.payments.upsertByGatewayPaymentId({
      userId: subscription.userId,
      gatewayPaymentId: payment.id,
      amount: payment.value,
      status: PAYMENT_STATUS[payment.status] ?? BillingPaymentStatus.PENDING,
      dueDate: payment.dueDate ?? null,
      paidAt: settled ? this.clock.now() : undefined,
      invoiceUrl: payment.invoiceUrl ?? null,
    });

    if (settled) {
      await this.plan.activate(
        subscription,
        payment.dueDate ? new Date(payment.dueDate) : this.clock.now(),
      );
    } else if (event === "PAYMENT_OVERDUE") {
      await this.plan.markPastDue(subscription);
    } else if (event === "PAYMENT_REFUNDED") {
      // The money went back, so the access goes with it.
      await this.plan.end(subscription, SubscriptionStatus.CANCELED);
    }
    // PAYMENT_DELETED only updates the record above: the gateway also deletes
    // the pending next charge when a subscription is canceled, and that must
    // not cut a period that was already paid for.
  }

  private async onSubscription(event: string, id: string): Promise<void> {
    if (!SUBSCRIPTION_STOPPED_EVENTS.has(event)) return;
    const subscription =
      await this.subscriptions.findByGatewaySubscriptionId(id);
    if (subscription) await this.onStopped(subscription);
  }

  private async onPixAuthorization(event: string, id: string): Promise<void> {
    const subscription =
      await this.subscriptions.findByGatewayPixAuthorizationId(id);
    if (!subscription) return;

    if (event === PIX_AUTHORIZATION_ACTIVATED) {
      // The immediate QR code that establishes consent has just been paid —
      // same meaning as the first settled charge of a checkout.
      if (subscription.status !== SubscriptionStatus.ACTIVE) {
        await this.plan.activate(subscription, this.clock.now());
      }
    } else if (PIX_AUTHORIZATION_STOPPED_EVENTS.has(event)) {
      await this.onStopped(subscription);
    }
  }

  private async onStopped(subscription: SubscriptionView): Promise<void> {
    // Already handled when the user canceled here, or already over.
    if (
      subscription.cancelAtPeriodEnd ||
      subscription.status === SubscriptionStatus.CANCELED ||
      subscription.status === SubscriptionStatus.EXPIRED
    ) {
      return;
    }
    await this.plan.stopRenewing(subscription);
  }
}
