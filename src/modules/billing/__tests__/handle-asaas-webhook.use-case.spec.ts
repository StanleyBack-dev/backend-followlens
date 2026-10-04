import type { ConfigService } from "@nestjs/config";
import { AppException } from "@/common/exceptions/app-exception";
import type { BillingPaymentRepositoryPort } from "@/modules/billing/application/ports/billing-payment-repository.port";
import type {
  SubscriptionRepositoryPort,
  SubscriptionView,
} from "@/modules/billing/application/ports/subscription-repository.port";
import { SubscriptionPlanService } from "@/modules/billing/application/subscription-plan.service";
import { HandleAsaasWebhookUseCase } from "@/modules/billing/application/use-cases/handle-asaas-webhook.use-case";
import { BillingCycle } from "@/modules/billing/domain/enums/billing-cycle.enum";
import { PaymentMethod } from "@/modules/billing/domain/enums/payment-method.enum";
import { SubscriptionStatus } from "@/modules/billing/domain/enums/subscription-status.enum";
import type { SendBillingEmailsUseCase } from "@/modules/mails/application/use-cases/send-billing-emails.use-case";
import type { UserRepositoryPort } from "@/modules/users/application/ports/user-repository.port";
import type { ClockPort } from "@/shared/application/ports/clock.port";

const TOKEN = "t".repeat(40);
const NOW = new Date("2026-10-03T12:00:00.000Z");
const payment = {
  id: "pay_1",
  subscription: "sub_1",
  value: 14.9,
  status: "CONFIRMED",
  dueDate: "2026-10-03",
};

function setup(initial: Partial<SubscriptionView> = {}) {
  let subscription: SubscriptionView = {
    id: "s-1",
    userId: "u-1",
    status: SubscriptionStatus.PENDING,
    billingCycle: BillingCycle.MONTHLY,
    paymentMethod: PaymentMethod.CHECKOUT,
    proStartedAt: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    gatewayCustomerId: "cus_1",
    gatewaySubscriptionId: "sub_1",
    gatewayPixAuthorizationId: null,
    pastDueSince: null,
    ...initial,
  };

  const subscriptions = {
    findByGatewaySubscriptionId: jest.fn(async (id: string) =>
      id === subscription.gatewaySubscriptionId ? subscription : null,
    ),
    save: jest.fn(async (_userId: string, changes) => {
      subscription = { ...subscription, ...changes };
      return subscription;
    }),
  } as unknown as SubscriptionRepositoryPort;
  const payments = {
    upsertByGatewayPaymentId: jest.fn(async () => undefined),
  } as unknown as BillingPaymentRepositoryPort;
  const users = {
    findById: jest.fn(async () => ({ email: "ana@test.com", name: "Ana" })),
    updateAccess: jest.fn(async () => null),
  } as unknown as UserRepositoryPort;
  const emails = {
    subscriptionActivated: jest.fn(async () => undefined),
    paymentOverdue: jest.fn(async () => undefined),
  } as unknown as SendBillingEmailsUseCase;
  const clock = { now: () => NOW } as unknown as ClockPort;
  const config = {
    get: (key: string) => (key === "ASAAS_WEBHOOK_TOKEN" ? TOKEN : undefined),
  } as unknown as ConfigService;

  const plan = new SubscriptionPlanService(
    subscriptions,
    users,
    {
      prices: { monthly: 14.9, yearly: 119.9 },
      pastDueGraceDays: 3,
      pixAutomaticEnabled: false,
    },
    clock,
    emails,
  );
  const useCase = new HandleAsaasWebhookUseCase(
    subscriptions,
    payments,
    clock,
    plan,
    config,
  );
  return { useCase, users, emails, payments, current: () => subscription };
}

describe("HandleAsaasWebhookUseCase", () => {
  it("rejects a call without the webhook token", async () => {
    const { useCase, payments } = setup();

    await expect(
      useCase.execute("wrong", { event: "PAYMENT_CONFIRMED", payment }),
    ).rejects.toBeInstanceOf(AppException);
    expect(payments.upsertByGatewayPaymentId).not.toHaveBeenCalled();
  });

  it("grants Pro for one cycle when the first payment settles", async () => {
    const { useCase, users, emails, current } = setup();

    await useCase.execute(TOKEN, { event: "PAYMENT_CONFIRMED", payment });

    expect(current()).toMatchObject({
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: new Date("2026-11-03T00:00:00.000Z"),
      proStartedAt: NOW,
    });
    expect(users.updateAccess).toHaveBeenCalledWith("u-1", { plan: "pro" });
    expect(emails.subscriptionActivated).toHaveBeenCalledTimes(1);
  });

  it("stays silent when the same payment is reported again", async () => {
    const { useCase, emails } = setup();

    await useCase.execute(TOKEN, { event: "PAYMENT_CONFIRMED", payment });
    await useCase.execute(TOKEN, { event: "PAYMENT_RECEIVED", payment });

    expect(emails.subscriptionActivated).toHaveBeenCalledTimes(1);
  });

  it("keeps Pro but marks the subscription overdue", async () => {
    const { useCase, users, emails, current } = setup({
      status: SubscriptionStatus.ACTIVE,
    });

    await useCase.execute(TOKEN, {
      event: "PAYMENT_OVERDUE",
      payment: { ...payment, status: "OVERDUE" },
    });

    expect(current()).toMatchObject({
      status: SubscriptionStatus.PAST_DUE,
      pastDueSince: NOW,
    });
    expect(users.updateAccess).not.toHaveBeenCalled();
    expect(emails.paymentOverdue).toHaveBeenCalledTimes(1);
  });

  it("removes Pro when the payment is refunded", async () => {
    const { useCase, users, current } = setup({
      status: SubscriptionStatus.ACTIVE,
    });

    await useCase.execute(TOKEN, {
      event: "PAYMENT_REFUNDED",
      payment: { ...payment, status: "REFUNDED" },
    });

    expect(current().status).toBe(SubscriptionStatus.CANCELED);
    expect(users.updateAccess).toHaveBeenCalledWith("u-1", { plan: "free" });
  });

  it("does not cut a paid period when the user-canceled subscription is deleted at the gateway", async () => {
    const { useCase, users, current } = setup({
      status: SubscriptionStatus.ACTIVE,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: new Date("2026-11-03T00:00:00.000Z"),
    });

    await useCase.execute(TOKEN, {
      event: "SUBSCRIPTION_DELETED",
      subscription: { id: "sub_1" },
    });
    await useCase.execute(TOKEN, {
      event: "PAYMENT_DELETED",
      payment: { ...payment, id: "pay_2", status: "DELETED" },
    });

    expect(current().status).toBe(SubscriptionStatus.ACTIVE);
    expect(users.updateAccess).not.toHaveBeenCalled();
  });

  it("ignores payments that belong to no subscription here", async () => {
    const { useCase, payments } = setup();

    await useCase.execute(TOKEN, {
      event: "PAYMENT_CONFIRMED",
      payment: { ...payment, subscription: "sub_other" },
    });

    expect(payments.upsertByGatewayPaymentId).not.toHaveBeenCalled();
  });
});
