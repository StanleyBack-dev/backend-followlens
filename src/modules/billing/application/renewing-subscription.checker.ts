import { Inject, Injectable } from "@nestjs/common";
import {
  SUBSCRIPTION_REPOSITORY,
  type SubscriptionRepositoryPort,
} from "@/modules/billing/application/ports/subscription-repository.port";
import { SubscriptionStatus } from "@/modules/billing/domain/enums/subscription-status.enum";

// Used by other contexts (account deletion) that must not proceed while the
// gateway is still set to charge the user.
@Injectable()
export class RenewingSubscriptionChecker {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptions: SubscriptionRepositoryPort,
  ) {}

  /** True while a subscription is still renewing at the gateway. */
  async isRenewing(userId: string): Promise<boolean> {
    const subscription = await this.subscriptions.findByUserId(userId);
    if (!subscription || subscription.cancelAtPeriodEnd) return false;
    return (
      subscription.status === SubscriptionStatus.ACTIVE ||
      subscription.status === SubscriptionStatus.PAST_DUE
    );
  }
}
