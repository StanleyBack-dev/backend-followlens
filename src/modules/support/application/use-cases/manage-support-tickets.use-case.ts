import { Inject, Injectable, Logger } from "@nestjs/common";
import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";
import { SendSupportEmailsUseCase } from "@/modules/mails/application/use-cases/send-support-emails.use-case";
import {
  type ListSupportTicketsFilters,
  SUPPORT_MESSAGE_REPOSITORY,
  type SupportMessageRepositoryPort,
  type SupportTicketView,
} from "@/modules/support/application/ports/support-message-repository.port";
import {
  emailTicketOf,
  type SupportTicketDetails,
  withPeople,
} from "@/modules/support/application/support-ticket-details";
import { SupportTicketStatus } from "@/modules/support/domain/support.enums";
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from "@/modules/users/application/ports/user-repository.port";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";
import type { Paginated } from "@/shared/application/pagination";

// The support team's side: list, read, reply and finalize. Access is limited
// to admins by the controller's guard.
@Injectable()
export class ManageSupportTicketsUseCase {
  private readonly logger = new Logger(ManageSupportTicketsUseCase.name);

  constructor(
    @Inject(SUPPORT_MESSAGE_REPOSITORY)
    private readonly messages: SupportMessageRepositoryPort,
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly emails: SendSupportEmailsUseCase,
  ) {}

  async list(
    filters: ListSupportTicketsFilters,
  ): Promise<Paginated<SupportTicketDetails>> {
    const page = await this.messages.list(filters);
    return { ...page, items: await withPeople(this.users, page.items) };
  }

  /** Tickets still waiting for a first reply. */
  countOpen(): Promise<number> {
    return this.messages.countByStatus(SupportTicketStatus.OPEN);
  }

  async get(ticketId: string): Promise<SupportTicketDetails> {
    return this.details(await this.mustFind(ticketId));
  }

  /** Answers the ticket (a new reply replaces the previous one). */
  async reply(
    adminId: string,
    ticketId: string,
    reply: string,
  ): Promise<SupportTicketDetails> {
    const ticket = await this.mustFind(ticketId);
    if (ticket.status === SupportTicketStatus.RESOLVED) {
      throw AppException.from(
        APP_ERRORS.support.ticketAlreadyResolved,
        undefined,
      );
    }

    const adminReply = reply.trim();
    const updated = await this.messages.reply(ticketId, {
      adminReply,
      repliedAt: this.clock.now(),
      repliedByAdminId: adminId,
    });
    await this.notify(updated, (user, details) =>
      this.emails.reply(user, details, adminReply),
    );
    return this.details(updated);
  }

  /** Closes an answered ticket. */
  async finalize(
    adminId: string,
    ticketId: string,
  ): Promise<SupportTicketDetails> {
    const ticket = await this.mustFind(ticketId);
    if (ticket.status === SupportTicketStatus.RESOLVED) {
      throw AppException.from(
        APP_ERRORS.support.ticketAlreadyResolved,
        undefined,
      );
    }
    if (ticket.status !== SupportTicketStatus.ANSWERED) {
      throw AppException.from(APP_ERRORS.support.ticketNotAnswered, undefined);
    }

    const updated = await this.messages.finalize(ticketId, {
      finalizedAt: this.clock.now(),
      finalizedByAdminId: adminId,
    });
    await this.notify(updated, (user, details) =>
      this.emails.finalized(user, details, updated.adminReply),
    );
    return this.details(updated);
  }

  private async mustFind(ticketId: string): Promise<SupportTicketView> {
    const ticket = await this.messages.findById(ticketId);
    if (!ticket) {
      throw AppException.from(APP_ERRORS.support.ticketNotFound, undefined);
    }
    return ticket;
  }

  private async details(
    ticket: SupportTicketView,
  ): Promise<SupportTicketDetails> {
    return (await withPeople(this.users, [ticket]))[0];
  }

  // Best-effort: the change is saved, a mail outage must not undo that.
  private async notify(
    ticket: SupportTicketView,
    send: (
      user: { email: string; name: string },
      details: ReturnType<typeof emailTicketOf>,
    ) => Promise<void>,
  ): Promise<void> {
    try {
      const user = await this.users.findById(ticket.userId);
      if (user) await send(user, emailTicketOf(ticket));
    } catch (error) {
      this.logger.warn(
        `Falha ao enviar e-mail do chamado ${ticket.protocolNumber}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
