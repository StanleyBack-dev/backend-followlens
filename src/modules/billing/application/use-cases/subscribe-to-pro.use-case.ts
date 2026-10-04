import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";
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
import { BillingCycle } from "@/modules/billing/domain/enums/billing-cycle.enum";
import { PaymentMethod } from "@/modules/billing/domain/enums/payment-method.enum";
import { SubscriptionStatus } from "@/modules/billing/domain/enums/subscription-status.enum";
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from "@/modules/users/application/ports/user-repository.port";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

export type SubscribeToProCommand = {
  /** Digits only. Sent to the gateway and never stored here. */
  cpfCnpj: string;
  billingCycle: BillingCycle;
  paymentMethod: PaymentMethod;
};

export type SubscribeToProResult = {
  /** Hosted invoice to pay (checkout method). */
  checkoutUrl: string | null;
  /** QR code to authorize the recurring Pix (Pix Automático method). */
  pixQrCode: { payload: string | null; image: string | null } | null;
};

const CYCLE_LABEL: Record<BillingCycle, string> = {
  [BillingCycle.MONTHLY]: "mensal",
  [BillingCycle.YEARLY]: "anual",
};

// Starts a Pro checkout at the gateway. Pro itself is only granted when the
// webhook reports the first payment.
@Injectable()
export class SubscribeToProUseCase {
  private readonly logger = new Logger(SubscribeToProUseCase.name);

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptions: SubscriptionRepositoryPort,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGatewayPort,
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(BILLING_SETTINGS) private readonly settings: BillingSettings,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly config: ConfigService,
  ) {}

  async execute(
    userId: string,
    command: SubscribeToProCommand,
  ): Promise<SubscribeToProResult> {
    if (
      command.paymentMethod === PaymentMethod.PIX_AUTOMATIC &&
      !this.settings.pixAutomaticEnabled
    ) {
      throw AppException.from(
        APP_ERRORS.billing.paymentMethodUnavailable,
        undefined,
      );
    }

    const user = await this.users.findById(userId);
    if (!user) {
      throw AppException.from(APP_ERRORS.auth.userNotFound, undefined);
    }

    const current = await this.subscriptions.findByUserId(userId);
    if (
      current?.status === SubscriptionStatus.ACTIVE ||
      current?.status === SubscriptionStatus.PAST_DUE
    ) {
      throw AppException.from(APP_ERRORS.billing.alreadySubscribed, undefined);
    }
    // An abandoned checkout would otherwise leave a second open charge.
    if (current) await this.discardAtGateway(current);

    let gatewayCustomerId = current?.gatewayCustomerId ?? null;
    if (!gatewayCustomerId) {
      gatewayCustomerId = await this.gateway.createCustomer({
        name: user.name,
        email: user.email,
        cpfCnpj: command.cpfCnpj,
        externalReference: userId,
      });
      // Saved before the next gateway call so a retry after a failure reuses
      // this customer instead of creating a duplicate.
      await this.subscriptions.save(userId, { gatewayCustomerId });
    }

    const value = this.settings.prices[command.billingCycle];
    const description = `FollowLens Pro - assinatura ${CYCLE_LABEL[command.billingCycle]}`;
    const today = this.clock.localDate();
    const pending = {
      status: SubscriptionStatus.PENDING,
      billingCycle: command.billingCycle,
      paymentMethod: command.paymentMethod,
      cancelAtPeriodEnd: false,
      pastDueSince: null,
      currentPeriodEnd: null,
    };

    if (command.paymentMethod === PaymentMethod.PIX_AUTOMATIC) {
      const authorization = await this.gateway.createPixAutomaticAuthorization({
        gatewayCustomerId,
        value,
        frequency:
          command.billingCycle === BillingCycle.YEARLY ? "ANNUALLY" : "MONTHLY",
        // The gateway caps this at 35 chars; a UUID without hyphens has 32.
        contractId: userId.replace(/-/g, ""),
        startDate: today,
        description,
      });
      await this.subscriptions.save(userId, {
        ...pending,
        gatewaySubscriptionId: null,
        gatewayPixAuthorizationId: authorization.pixAutomaticAuthorizationId,
      });
      return {
        checkoutUrl: null,
        pixQrCode: {
          payload: authorization.qrCodePayload,
          image: authorization.qrCodeImage,
        },
      };
    }

    const created = await this.gateway.createSubscription({
      gatewayCustomerId,
      value,
      nextDueDate: today,
      cycle:
        command.billingCycle === BillingCycle.YEARLY ? "YEARLY" : "MONTHLY",
      description,
      externalReference: userId,
      callbackSuccessUrl: this.successUrl(),
    });
    await this.subscriptions.save(userId, {
      ...pending,
      gatewaySubscriptionId: created.gatewaySubscriptionId,
      gatewayPixAuthorizationId: null,
    });
    return { checkoutUrl: created.checkoutUrl, pixQrCode: null };
  }

  // Best-effort: the old charge may already be gone at the gateway.
  private async discardAtGateway(current: SubscriptionView): Promise<void> {
    try {
      if (current.gatewaySubscriptionId) {
        await this.gateway.cancelSubscription(current.gatewaySubscriptionId);
      }
      if (current.gatewayPixAuthorizationId) {
        await this.gateway.cancelPixAutomaticAuthorization(
          current.gatewayPixAuthorizationId,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Não foi possível descartar a cobrança anterior do usuário ${current.userId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // The gateway rejects the whole request unless the return URL is https and
  // on the domain registered in the gateway account, so the redirect back is
  // opt-in. Without it the customer returns on their own and the page picks
  // the payment up by polling.
  private successUrl(): string | undefined {
    if (this.config.get<boolean>("BILLING_CHECKOUT_RETURN_ENABLED") !== true) {
      return undefined;
    }
    const frontendUrl = (this.config.get<string>("FRONTEND_URL") ?? "").replace(
      /\/$/,
      "",
    );
    return frontendUrl.startsWith("https://")
      ? `${frontendUrl}/account/billing?checkout=success`
      : undefined;
  }
}
