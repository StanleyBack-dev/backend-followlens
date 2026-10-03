import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  type MailAddress,
  MAIL_PROVIDER,
  type MailProviderPort,
} from "@/modules/mails/application/ports/mail-provider.port";
import { buildWelcomeEmail } from "@/modules/mails/application/templates/onboarding/welcome-email.template";

export type WelcomeEmailCommand = {
  to: string;
  name: string;
};

// Sent once, when an account is created on the first Google sign-in.
@Injectable()
export class SendWelcomeEmailUseCase {
  private readonly logger = new Logger(SendWelcomeEmailUseCase.name);

  constructor(
    @Inject(MAIL_PROVIDER) private readonly mailProvider: MailProviderPort,
    private readonly config: ConfigService,
  ) {}

  /** @throws when the provider fails — callers decide whether to swallow it. */
  async execute(command: WelcomeEmailCommand): Promise<void> {
    const email = buildWelcomeEmail({
      name: command.name,
      appUrl: this.config.get<string>("FRONTEND_URL") ?? "http://localhost:3000",
    });

    await this.mailProvider.send({
      to: { email: command.to, name: command.name },
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo: this.replyTo(),
      tags: ["welcome"],
    });
    this.logger.log(`E-mail de boas-vindas enviado para ${command.to}`);
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
