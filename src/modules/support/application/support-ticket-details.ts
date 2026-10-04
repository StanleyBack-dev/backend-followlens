import type { SendSupportEmailsUseCase } from "@/modules/mails/application/use-cases/send-support-emails.use-case";
import type { SupportTicketView } from "@/modules/support/application/ports/support-message-repository.port";
import {
  formatProtocol,
  SUPPORT_CATEGORY_LABELS,
} from "@/modules/support/domain/support.enums";
import type { UserRepositoryPort } from "@/modules/users/application/ports/user-repository.port";

/** A ticket as the support team sees it: with who sent and who closed it. */
export type SupportTicketDetails = SupportTicketView & {
  userName: string;
  userEmail: string;
  finalizedByName: string | null;
};

const UNKNOWN = "—";

export async function withPeople(
  users: UserRepositoryPort,
  tickets: SupportTicketView[],
): Promise<SupportTicketDetails[]> {
  const ids = new Set<string>();
  for (const ticket of tickets) {
    ids.add(ticket.userId);
    if (ticket.finalizedByAdminId) ids.add(ticket.finalizedByAdminId);
  }
  const people = new Map(
    (await users.findByIds([...ids])).map((user) => [user.id, user]),
  );

  return tickets.map((ticket) => ({
    ...ticket,
    userName: people.get(ticket.userId)?.name ?? UNKNOWN,
    userEmail: people.get(ticket.userId)?.email ?? UNKNOWN,
    finalizedByName: ticket.finalizedByAdminId
      ? (people.get(ticket.finalizedByAdminId)?.name ?? UNKNOWN)
      : null,
  }));
}

/** The ticket fields every support e-mail needs. */
export function emailTicketOf(
  ticket: SupportTicketView,
): Parameters<SendSupportEmailsUseCase["confirmation"]>[1] {
  return {
    id: ticket.id,
    protocol: formatProtocol(ticket.protocolNumber),
    categoryLabel: SUPPORT_CATEGORY_LABELS[ticket.category],
    message: ticket.message,
  };
}
