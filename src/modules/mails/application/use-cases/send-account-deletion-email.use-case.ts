import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  type MailAddress,
  MAIL_PROVIDER,
  type MailProviderPort,
} from "@/modules/mails/application/ports/mail-provider.port";
import { buildAccountDeletionEmail } from "@/modules/mails/application/templates/account/account-deletion-email.template";

export type AccountDeletionEmailCommand = {
  to: string;
  name: string;
  graceDays: number;
  scheduledFor: Date;
};

// Sent when the user schedules the deletion of their own account.
@Injectable()
export class SendAccountDeletionEmailUseCase {
  private readonly logger = new Logger(SendAccountDeletionEmailUseCase.name);

  constructor(
    @Inject(MAIL_PROVIDER) private readonly mailProvider: MailProviderPort,
    private readonly config: ConfigService,
  ) {}

  /** @throws when the provider fails — callers decide whether to swallow it. */
  async execute(command: AccountDeletionEmailCommand): Promise<void> {
    const email = buildAccountDeletionEmail({
      name: command.name,
      appUrl:
        this.config.get<string>("FRONTEND_URL") ?? "http://localhost:3000",
      graceDays: command.graceDays,
      scheduledForLabel: new Intl.DateTimeFormat("pt-BR", {
        timeZone:
          this.config.get<string>("APP_TIMEZONE") ?? "America/Sao_Paulo",
        dateStyle: "long",
      }).format(command.scheduledFor),
    });

    await this.mailProvider.send({
      to: { email: command.to, name: command.name },
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo: this.replyTo(),
      tags: ["account-deletion"],
    });
    this.logger.log(`E-mail de exclusão de conta enviado para ${command.to}`);
  }

  private replyTo(): MailAddress | undefined {
    const email = this.config.get<string>("MAIL_REPLY_TO_EMAIL");
    if (!email) return undefined;
    return {
      email,
      name:
        this.config.get<string>("MAIL_REPLY_TO_NAME") ||
        this.config.get<string>("MAIL_FROM_NAME") ||
        "FollowLens",
    };
  }
}
