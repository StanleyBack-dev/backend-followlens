import type { ConfigService } from "@nestjs/config";
import type { PaymentGatewayPort } from "@/modules/billing/application/ports/payment-gateway.port";
import type {
  SubscriptionRepositoryPort,
  SubscriptionView,
} from "@/modules/billing/application/ports/subscription-repository.port";
import { ProDaysService } from "@/modules/billing/application/pro-days.service";
import { ReferralRewardCoordinator } from "@/modules/billing/application/referral-reward.coordinator";
import { SubscriptionStatus } from "@/modules/billing/domain/enums/subscription-status.enum";
import type { SendReferralEmailsUseCase } from "@/modules/mails/application/use-cases/send-referral-emails.use-case";
import {
  type ReferralClickRepositoryPort,
  type ReferralRewardRepositoryPort,
  type ReferralRewardView,
} from "@/modules/referrals/application/ports/referral-reward-repository.port";
import { ReferralsService } from "@/modules/referrals/application/referrals.service";
import type {
  UserRepositoryPort,
  UserView,
} from "@/modules/users/application/ports/user-repository.port";
import type { ClockPort } from "@/shared/application/ports/clock.port";

const NOW = new Date("2026-10-05T12:00:00.000Z");
const DAY_MS = 86_400_000;

type TestUser = Pick<
  UserView,
  | "id"
  | "email"
  | "name"
  | "createdAt"
  | "proBonusUntil"
  | "referralCode"
  | "referredByUserId"
  | "referralQualifiedAt"
>;

function setup(
  options: {
    referrerSubscription?: Partial<SubscriptionView>;
    gatewayFails?: boolean;
  } = {},
) {
  const people = new Map<string, TestUser>(
    [
      {
        id: "referrer",
        email: "ana@test.com",
        name: "Ana Souza",
        referralCode: "ABCD2345",
        referredByUserId: null,
      },
      {
        id: "friend",
        email: "bia@test.com",
        name: "Bia Lima",
        referralCode: null,
        referredByUserId: null,
      },
    ].map((user) => [
      user.id,
      {
        ...user,
        createdAt: NOW,
        proBonusUntil: null,
        referralQualifiedAt: null,
      },
    ]),
  );
  const patch = (id: string, changes: Partial<TestUser>) =>
    people.set(id, { ...(people.get(id) as TestUser), ...changes });

  const users = {
    findById: jest.fn(async (id: string) => people.get(id) ?? null),
    findByReferralCode: jest.fn(
      async (code: string) =>
        [...people.values()].find((user) => user.referralCode === code) ?? null,
    ),
    setReferredBy: jest.fn(async (id: string, referrerId: string) =>
      patch(id, { referredByUserId: referrerId }),
    ),
    markReferralQualified: jest.fn(async (id: string, at: Date) =>
      patch(id, { referralQualifiedAt: at }),
    ),
    setProBonusUntil: jest.fn(async (id: string, until: Date | null) =>
      patch(id, { proBonusUntil: until }),
    ),
    listReferredBy: jest.fn(async (id: string) =>
      [...people.values()].filter((user) => user.referredByUserId === id),
    ),
  } as unknown as UserRepositoryPort;

  let rewards: ReferralRewardView[] = [];
  const rewardRepository = {
    record: jest.fn(async (input) => {
      const reward = {
        id: `r-${rewards.length + 1}`,
        revokedAt: null,
        createdAt: NOW,
        ...input,
      };
      rewards = [...rewards, reward];
      return reward;
    }),
    listByReferrer: jest.fn(async (id: string) =>
      rewards.filter((reward) => reward.referrerId === id),
    ),
    findActiveByReferred: jest.fn(
      async (id: string) =>
        rewards.find(
          (reward) => reward.referredUserId === id && !reward.revokedAt,
        ) ?? null,
    ),
    markRevoked: jest.fn(async (id: string, at: Date) => {
      rewards = rewards.map((reward) =>
        reward.id === id ? { ...reward, revokedAt: at } : reward,
      );
    }),
  } as unknown as ReferralRewardRepositoryPort;

  const clickLog: Date[] = [];
  const clicks = {
    record: jest.fn(async (_id: string, at: Date) => {
      clickLog.push(at);
    }),
    stats: jest.fn(async () => ({
      total: clickLog.length,
      recent: clickLog.length,
      latest: clickLog,
    })),
  } as unknown as ReferralClickRepositoryPort;

  let subscription: SubscriptionView | null = options.referrerSubscription
    ? ({
        id: "s-1",
        userId: "referrer",
        status: SubscriptionStatus.ACTIVE,
        billingCycle: null,
        paymentMethod: null,
        proStartedAt: NOW,
        currentPeriodEnd: new Date("2026-10-20T00:00:00.000Z"),
        cancelAtPeriodEnd: false,
        gatewayCustomerId: "cus_1",
        gatewaySubscriptionId: "sub_1",
        gatewayPixAuthorizationId: null,
        pastDueSince: null,
        ...options.referrerSubscription,
      } as SubscriptionView)
    : null;
  const subscriptions = {
    findByUserId: jest.fn(async (id: string) =>
      id === "referrer" ? subscription : null,
    ),
    save: jest.fn(async (_id: string, changes) => {
      subscription = { ...(subscription as SubscriptionView), ...changes };
      return subscription;
    }),
  } as unknown as SubscriptionRepositoryPort;
  const gateway = {
    shiftNextCharge: jest.fn(async () => {
      if (options.gatewayFails) throw new Error("asaas down");
    }),
  } as unknown as PaymentGatewayPort & Record<string, jest.Mock>;

  const clock = { now: () => NOW } as unknown as ClockPort;
  const config = { get: () => undefined } as unknown as ConfigService;
  const emails = {
    rewardGranted: jest.fn(async () => undefined),
  } as unknown as SendReferralEmailsUseCase & Record<string, jest.Mock>;

  const referrals = new ReferralsService(
    users,
    rewardRepository,
    clicks,
    clock,
    config,
  );
  const proDays = new ProDaysService(subscriptions, gateway, users, clock);
  const coordinator = new ReferralRewardCoordinator(
    referrals,
    proDays,
    emails,
    users,
  );
  return {
    referrals,
    coordinator,
    gateway,
    emails,
    user: (id: string) => people.get(id) as TestUser,
    subscription: () => subscription,
  };
}

describe("referral rewards", () => {
  it("links a new account to whoever invited it, but never to itself", async () => {
    const { referrals, user } = setup();

    await referrals.attribute("friend", "ABCD2345");
    await referrals.attribute("referrer", "ABCD2345");
    await referrals.attribute("friend", undefined);

    expect(user("friend").referredByUserId).toBe("referrer");
    expect(user("referrer").referredByUserId).toBeNull();
  });

  it("gives a Free referrer 30 days of Pro on the friend's first payment, once", async () => {
    const { referrals, coordinator, user, emails } = setup();
    await referrals.attribute("friend", "ABCD2345");

    await coordinator.onFirstPayment("friend");
    await coordinator.onFirstPayment("friend");

    expect(user("referrer").proBonusUntil).toEqual(
      new Date(NOW.getTime() + 30 * DAY_MS),
    );
    expect(emails.rewardGranted).toHaveBeenCalledTimes(1);
    expect(await referrals.overview("referrer")).toMatchObject({
      invited: 1,
      qualified: 1,
      daysEarned: 30,
      friends: [{ name: "Bia", qualified: true }],
    });
  });

  it("pushes a paying referrer's next charge forward instead", async () => {
    const { referrals, coordinator, gateway, user, subscription } = setup({
      referrerSubscription: {},
    });
    await referrals.attribute("friend", "ABCD2345");

    await coordinator.onFirstPayment("friend");

    expect(gateway.shiftNextCharge).toHaveBeenCalledWith("sub_1", 30);
    expect(subscription()?.currentPeriodEnd).toEqual(
      new Date("2026-11-19T00:00:00.000Z"),
    );
    expect(user("referrer").proBonusUntil).toBeNull();
  });

  it("falls back to bonus days when the gateway refuses to move the charge", async () => {
    const { referrals, coordinator, user } = setup({
      referrerSubscription: {},
      gatewayFails: true,
    });
    await referrals.attribute("friend", "ABCD2345");

    await coordinator.onFirstPayment("friend");

    // Starts after the period already paid for.
    expect(user("referrer").proBonusUntil).toEqual(
      new Date("2026-11-19T00:00:00.000Z"),
    );
  });

  it("takes the reward back when the friend's payment is refunded", async () => {
    const { referrals, coordinator, user } = setup();
    await referrals.attribute("friend", "ABCD2345");
    await coordinator.onFirstPayment("friend");

    await coordinator.onRefund("friend");

    expect(user("referrer").proBonusUntil).toBeNull();
    expect((await referrals.overview("referrer")).qualified).toBe(0);
  });

  it("rewards nobody when the payer was not referred", async () => {
    const { coordinator, user, emails } = setup();

    await coordinator.onFirstPayment("friend");

    expect(user("referrer").proBonusUntil).toBeNull();
    expect(emails.rewardGranted).not.toHaveBeenCalled();
  });

  it("counts link clicks only for known codes", async () => {
    const { referrals } = setup();

    await referrals.recordClick("ABCD2345");
    await referrals.recordClick("ZZZZ9999");

    expect((await referrals.overview("referrer")).clicks).toBe(1);
  });
});
