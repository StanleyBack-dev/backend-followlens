import { Inject, Injectable, Logger } from "@nestjs/common";
import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";
import { SendSupportEmailsUseCase } from "@/modules/mails/application/use-cases/send-support-emails.use-case";
import {
  SUPPORT_MESSAGE_REPOSITORY,
  type SupportMessageRepositoryPort,
} from "@/modules/support/application/ports/support-message-repository.port";
import { emailTicketOf } from "@/modules/support/application/support-ticket-details";
import type { SupportCategory } from "@/modules/support/domain/support.enums";
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from "@/modules/users/application/ports/user-repository.port";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

const DAY_MS = 86_400_000;

export type SendSupportMessageCommand = {
  category: SupportCategory;
  message: string;
};

export type SentSupportMessage = {
  protocolNumber: number;
  category: SupportCategory;
  message: string;
  createdAt: Date;
};

export type SupportMessageStatus = {
  canSend: boolean;
  /** When the next message is allowed; null while one can be sent. */
  nextAllowedAt: Date | null;
};

// A user may open one ticket per calendar day (app timezone). The team
// answers by e-mail, so the user only ever sends from here.
@Injectable()
export class SendSupportMessageUseCase {
  private readonly logger = new Logger(SendSupportMessageUseCase.name);

  constructor(
    @Inject(SUPPORT_MESSAGE_REPOSITORY)
    private readonly messages: SupportMessageRepositoryPort,
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly emails: SendSupportEmailsUseCase,
  ) {}

  async status(userId: string): Promise<SupportMessageStatus> {
    const startOfTomorrow = this.clock.startOfNextLocalDay();
    const sentToday = await this.messages.hasMessageSince(
      userId,
      new Date(startOfTomorrow.getTime() - DAY_MS),
    );
    return sentToday
      ? { canSend: false, nextAllowedAt: startOfTomorrow }
      : { canSend: true, nextAllowedAt: null };
  }

  async execute(
    userId: string,
    command: SendSupportMessageCommand,
  ): Promise<SentSupportMessage> {
    if (!(await this.status(userId)).canSend) {
      throw AppException.from(APP_ERRORS.support.dailyLimitReached, undefined);
    }

    const ticket = await this.messages.create({
      userId,
      category: command.category,
      message: command.message.trim(),
      createdAt: this.clock.now(),
    });

    // Best-effort: the ticket is saved, a mail outage must not undo that.
    try {
      const user = await this.users.findById(userId);
      if (user) {
        const details = emailTicketOf(ticket);
        await this.emails.notification(user, details);
        await this.emails.confirmation(user, details);
      }
    } catch (error) {
      this.logger.warn(
        `Falha ao enviar e-mails do chamado ${ticket.protocolNumber}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return {
      protocolNumber: ticket.protocolNumber,
      category: ticket.category,
      message: ticket.message,
      createdAt: ticket.createdAt,
    };
  }
}
