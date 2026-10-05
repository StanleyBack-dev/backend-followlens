import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  MAIL_PROVIDER,
  type MailProviderPort,
} from "@/modules/mails/application/ports/mail-provider.port";
import { buildReferralRewardEmail } from "@/modules/mails/application/templates/referrals/referral-reward-email.template";

export type ReferralRewardEmailCommand = {
  to: string;
  name: string;
  days: number;
  appliedAs: "pro_bonus" | "postponed_charge";
};

// Throws when the provider fails — callers decide whether to swallow it.
@Injectable()
export class SendReferralEmailsUseCase {
  constructor(
    @Inject(MAIL_PROVIDER) private readonly mailProvider: MailProviderPort,
    private readonly config: ConfigService,
  ) {}

  async rewardGranted(command: ReferralRewardEmailCommand): Promise<void> {
    const email = buildReferralRewardEmail({
      name: command.name,
      appUrl:
        this.config.get<string>("FRONTEND_URL") ?? "http://localhost:3000",
      days: command.days,
      postponedCharge: command.appliedAs === "postponed_charge",
    });
    await this.mailProvider.send({
      to: { email: command.to, name: command.name },
      subject: email.subject,
      html: email.html,
      text: email.text,
      tags: ["referral-reward"],
    });
  }
}
