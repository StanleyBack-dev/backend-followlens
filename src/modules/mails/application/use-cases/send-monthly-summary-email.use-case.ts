import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  MAIL_PROVIDER,
  type MailProviderPort,
} from "@/modules/mails/application/ports/mail-provider.port";
import { buildMonthlySummaryEmail } from "@/modules/mails/application/templates/engagement/monthly-summary-email.template";

export type MonthlySummaryEmailCommand = {
  to: string;
  name: string;
  profileName: string;
  summary: {
    month: string;
    gained: number;
    returned: number;
    lost: number;
    net: number;
    imports: number;
    followersAtEnd: number | null;
  };
};

// Throws when the provider fails — callers decide whether to swallow it.
@Injectable()
export class SendMonthlySummaryEmailUseCase {
  constructor(
    @Inject(MAIL_PROVIDER) private readonly mailProvider: MailProviderPort,
    private readonly config: ConfigService,
  ) {}

  async execute(command: MonthlySummaryEmailCommand): Promise<void> {
    const [year, month] = command.summary.month.split("-").map(Number);
    const email = buildMonthlySummaryEmail({
      name: command.name,
      appUrl:
        this.config.get<string>("FRONTEND_URL") ?? "http://localhost:3000",
      profileName: command.profileName,
      ...command.summary,
      // Mid-month and UTC, so no timezone can push it into a neighbor month.
      monthLabel: new Intl.DateTimeFormat("pt-BR", {
        timeZone: "UTC",
        month: "long",
        year: "numeric",
      }).format(new Date(Date.UTC(year, month - 1, 15))),
    });
    await this.mailProvider.send({
      to: { email: command.to, name: command.name },
      subject: email.subject,
      html: email.html,
      text: email.text,
      tags: ["monthly-summary"],
    });
  }
}
