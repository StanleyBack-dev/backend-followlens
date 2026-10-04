import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  type MailAddress,
  MAIL_PROVIDER,
  type MailProviderPort,
} from "@/modules/mails/application/ports/mail-provider.port";
import {
  buildPaymentOverdueEmail,
  buildSubscriptionActivatedEmail,
} from "@/modules/mails/application/templates/billing/billing-emails.template";

export type SubscriptionActivatedEmailCommand = {
  to: string;
  name: string;
  yearly: boolean;
  renewsOn: Date | null;
};

export type PaymentOverdueEmailCommand = {
  to: string;
  name: string;
  graceDays: number;
};

// Transactional e-mails of the Pro subscription. Both throw when the provider
// fails — callers decide whether to swallow it.
@Injectable()
export class SendBillingEmailsUseCase {
  constructor(
    @Inject(MAIL_PROVIDER) private readonly mailProvider: MailProviderPort,
    private readonly config: ConfigService,
  ) {}

  async subscriptionActivated(
    command: SubscriptionActivatedEmailCommand,
  ): Promise<void> {
    const email = buildSubscriptionActivatedEmail({
      name: command.name,
      appUrl: this.appUrl(),
      cycleLabel: command.yearly ? "anual" : "mensal",
      renewsOnLabel: command.renewsOn
        ? new Intl.DateTimeFormat("pt-BR", {
            timeZone:
              this.config.get<string>("APP_TIMEZONE") ?? "America/Sao_Paulo",
            dateStyle: "long",
          }).format(command.renewsOn)
        : null,
    });
    await this.mailProvider.send({
      to: { email: command.to, name: command.name },
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo: this.replyTo(),
      tags: ["subscription-activated"],
    });
  }

  async paymentOverdue(command: PaymentOverdueEmailCommand): Promise<void> {
    const email = buildPaymentOverdueEmail({
      name: command.name,
      appUrl: this.appUrl(),
      graceDays: command.graceDays,
    });
    await this.mailProvider.send({
      to: { email: command.to, name: command.name },
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo: this.replyTo(),
      tags: ["payment-overdue"],
    });
  }

  private appUrl(): string {
    return this.config.get<string>("FRONTEND_URL") ?? "http://localhost:3000";
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
