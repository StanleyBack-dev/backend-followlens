import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  MAIL_PROVIDER,
  type MailProviderPort,
} from "@/modules/mails/application/ports/mail-provider.port";
import {
  buildSupportConfirmationEmail,
  buildSupportFinalizedEmail,
  buildSupportNotificationEmail,
  buildSupportReplyEmail,
} from "@/modules/mails/application/templates/support/support-emails.template";
import type { RenderedEmail } from "@/modules/mails/application/templates/alerts/unfollow-alert-email.template";

export type SupportEmailTicket = {
  id: string;
  /** Already formatted, e.g. "#000042". */
  protocol: string;
  categoryLabel: string;
  message: string;
};

export type SupportEmailRecipient = { email: string; name: string };

// Transactional e-mails of the support flow. Every method throws when the
// provider fails — callers decide whether to swallow it.
@Injectable()
export class SendSupportEmailsUseCase {
  constructor(
    @Inject(MAIL_PROVIDER) private readonly mailProvider: MailProviderPort,
    private readonly config: ConfigService,
  ) {}

  /** To the user: the ticket was opened. */
  async confirmation(
    user: SupportEmailRecipient,
    ticket: SupportEmailTicket,
  ): Promise<void> {
    await this.send(
      user,
      buildSupportConfirmationEmail({
        name: user.name,
        appUrl: this.appUrl(),
        ...ticket,
      }),
      "support-confirmation",
    );
  }

  /**
   * To the team: a new ticket arrived. Replying to it goes straight to the
   * user. Skipped when no support address is configured.
   */
  async notification(
    user: SupportEmailRecipient,
    ticket: SupportEmailTicket,
  ): Promise<void> {
    const team = this.teamAddress();
    if (!team) return;
    const email = buildSupportNotificationEmail({
      userName: user.name,
      userEmail: user.email,
      appUrl: this.appUrl(),
      ticketId: ticket.id,
      protocol: ticket.protocol,
      categoryLabel: ticket.categoryLabel,
      message: ticket.message,
    });
    await this.mailProvider.send({
      to: { email: team, name: "Suporte FollowLens" },
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo: { email: user.email, name: user.name },
      tags: ["support-notification"],
    });
  }

  /** To the user: the team replied. */
  async reply(
    user: SupportEmailRecipient,
    ticket: SupportEmailTicket,
    reply: string,
  ): Promise<void> {
    await this.send(
      user,
      buildSupportReplyEmail({
        name: user.name,
        appUrl: this.appUrl(),
        ...ticket,
        reply,
      }),
      "support-reply",
    );
  }

  /** To the user: the ticket was closed. */
  async finalized(
    user: SupportEmailRecipient,
    ticket: SupportEmailTicket,
    reply: string | null,
  ): Promise<void> {
    await this.send(
      user,
      buildSupportFinalizedEmail({
        name: user.name,
        appUrl: this.appUrl(),
        protocol: ticket.protocol,
        categoryLabel: ticket.categoryLabel,
        reply,
      }),
      "support-finalized",
    );
  }

  private async send(
    user: SupportEmailRecipient,
    email: RenderedEmail,
    tag: string,
  ): Promise<void> {
    const team = this.teamAddress();
    await this.mailProvider.send({
      to: { email: user.email, name: user.name },
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo: team ? { email: team, name: "Suporte FollowLens" } : undefined,
      tags: [tag],
    });
  }

  // Where new tickets are announced: the support address, or the owner's.
  private teamAddress(): string | null {
    return (
      this.config.get<string>("SUPPORT_NOTIFICATION_EMAIL") ||
      this.config.get<string>("OWNER_EMAIL") ||
      null
    );
  }

  private appUrl(): string {
    return this.config.get<string>("FRONTEND_URL") ?? "http://localhost:3000";
  }
}
