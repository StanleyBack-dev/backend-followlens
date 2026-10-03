import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  MAIL_PROVIDER,
  type MailProviderPort,
} from "@/modules/mails/application/ports/mail-provider.port";
import {
  buildUnfollowAlertEmail,
  type UnfollowAlertItem,
} from "@/modules/mails/application/templates/alerts/unfollow-alert-email.template";

@Injectable()
export class SendUnfollowAlertEmailUseCase {
  constructor(
    @Inject(MAIL_PROVIDER) private readonly mailProvider: MailProviderPort,
    private readonly config: ConfigService,
  ) {}

  /** @throws when the provider fails — the caller keeps the alert pending. */
  async execute(
    recipientEmail: string,
    payload: { items: UnfollowAlertItem[] },
  ): Promise<void> {
    if (payload.items.length === 0) return;

    const email = buildUnfollowAlertEmail({
      items: payload.items,
      appUrl:
        this.config.get<string>("FRONTEND_URL") ?? "http://localhost:3000",
      timeZone: this.config.get<string>("APP_TIMEZONE") ?? "America/Sao_Paulo",
    });

    await this.mailProvider.send({
      to: { email: recipientEmail },
      subject: email.subject,
      html: email.html,
      text: email.text,
      tags: ["unfollow-alert"],
    });
  }
}
