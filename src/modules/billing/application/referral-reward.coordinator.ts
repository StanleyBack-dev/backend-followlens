import { Inject, Injectable, Logger } from "@nestjs/common";
import { ProDaysService } from "@/modules/billing/application/pro-days.service";
import { SendReferralEmailsUseCase } from "@/modules/mails/application/use-cases/send-referral-emails.use-case";
import { ReferralsService } from "@/modules/referrals/application/referrals.service";
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from "@/modules/users/application/ports/user-repository.port";

// Turns a referred user's first payment into Pro days for whoever invited
// them, and undoes it on a refund. Never throws: it runs inside the payment
// webhook, which must not fail because of a reward.
@Injectable()
export class ReferralRewardCoordinator {
  private readonly logger = new Logger(ReferralRewardCoordinator.name);

  constructor(
    private readonly referrals: ReferralsService,
    private readonly proDays: ProDaysService,
    private readonly emails: SendReferralEmailsUseCase,
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
  ) {}

  async onFirstPayment(referredUserId: string): Promise<void> {
    try {
      const referrerId = await this.referrals.qualify(referredUserId);
      if (!referrerId) return;

      const days = this.referrals.rewardDays();
      const appliedAs = await this.proDays.grant(referrerId, days);
      await this.referrals.recordReward({
        referrerId,
        referredUserId,
        days,
        appliedAs,
      });

      const referrer = await this.users.findById(referrerId);
      if (referrer) {
        await this.emails.rewardGranted({
          to: referrer.email,
          name: referrer.name,
          days,
          appliedAs,
        });
      }
    } catch (error) {
      this.logger.error(
        `Falha ao recompensar a indicação do usuário ${referredUserId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async onRefund(referredUserId: string): Promise<void> {
    try {
      const reward = await this.referrals.revokeRewardFrom(referredUserId);
      if (reward) {
        await this.proDays.revoke(
          reward.referrerId,
          reward.days,
          reward.appliedAs,
        );
      }
    } catch (error) {
      this.logger.error(
        `Falha ao desfazer a recompensa da indicação do usuário ${referredUserId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
