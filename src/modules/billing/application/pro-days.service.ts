import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  PAYMENT_GATEWAY,
  type PaymentGatewayPort,
} from "@/modules/billing/application/ports/payment-gateway.port";
import {
  SUBSCRIPTION_REPOSITORY,
  type SubscriptionRepositoryPort,
  type SubscriptionView,
} from "@/modules/billing/application/ports/subscription-repository.port";
import { SubscriptionStatus } from "@/modules/billing/domain/enums/subscription-status.enum";
import { RewardApplication } from "@/modules/referrals/application/ports/referral-reward-repository.port";
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from "@/modules/users/application/ports/user-repository.port";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

const DAY_MS = 86_400_000;

// Gives (or takes back) free Pro days. A renewing subscriber gets the next
// charge pushed forward; everyone else gets time-limited Pro on the account.
@Injectable()
export class ProDaysService {
  private readonly logger = new Logger(ProDaysService.name);

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptions: SubscriptionRepositoryPort,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGatewayPort,
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async grant(userId: string, days: number): Promise<RewardApplication> {
    const subscription = await this.subscriptions.findByUserId(userId);
    if (subscription && isRenewing(subscription)) {
      try {
        await this.shiftNextCharge(subscription, days);
        return RewardApplication.POSTPONED_CHARGE;
      } catch (error) {
        // The reward must not be lost to a gateway hiccup: fall back to bonus.
        this.logger.warn(
          `Não foi possível adiar a cobrança do usuário ${userId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    const user = await this.users.findById(userId);
    const now = this.clock.now().getTime();
    // The bonus starts after whatever Pro the user already has paid for.
    const paidUntil =
      subscription && hasPaidPro(subscription)
        ? (subscription.currentPeriodEnd?.getTime() ?? now)
        : now;
    const base = Math.max(now, paidUntil, user?.proBonusUntil?.getTime() ?? 0);
    await this.users.setProBonusUntil(userId, new Date(base + days * DAY_MS));
    return RewardApplication.PRO_BONUS;
  }

  async revoke(
    userId: string,
    days: number,
    appliedAs: RewardApplication,
  ): Promise<void> {
    if (appliedAs === RewardApplication.POSTPONED_CHARGE) {
      const subscription = await this.subscriptions.findByUserId(userId);
      if (subscription && isRenewing(subscription)) {
        await this.shiftNextCharge(subscription, -days);
      }
      return;
    }

    const user = await this.users.findById(userId);
    if (!user?.proBonusUntil) return;
    const until = new Date(user.proBonusUntil.getTime() - days * DAY_MS);
    await this.users.setProBonusUntil(
      userId,
      until > this.clock.now() ? until : null,
    );
  }

  private async shiftNextCharge(
    subscription: SubscriptionView,
    days: number,
  ): Promise<void> {
    await this.gateway.shiftNextCharge(
      subscription.gatewaySubscriptionId as string,
      days,
    );
    await this.subscriptions.save(subscription.userId, {
      currentPeriodEnd: new Date(
        (subscription.currentPeriodEnd as Date).getTime() + days * DAY_MS,
      ),
    });
  }
}

function hasPaidPro(subscription: SubscriptionView): boolean {
  return (
    subscription.status === SubscriptionStatus.ACTIVE ||
    subscription.status === SubscriptionStatus.PAST_DUE
  );
}

function isRenewing(subscription: SubscriptionView): boolean {
  return (
    subscription.status === SubscriptionStatus.ACTIVE &&
    !subscription.cancelAtPeriodEnd &&
    subscription.gatewaySubscriptionId !== null &&
    subscription.currentPeriodEnd !== null
  );
}
