import type {
  SupportCategory,
  SupportTicketStatus,
} from "@/modules/support/domain/support.enums";
import type { PageRequest, Paginated } from "@/shared/application/pagination";

export type SupportTicketView = {
  id: string;
  userId: string;
  protocolNumber: number;
  category: SupportCategory;
  message: string;
  status: SupportTicketStatus;
  adminReply: string | null;
  repliedAt: Date | null;
  repliedByAdminId: string | null;
  finalizedAt: Date | null;
  finalizedByAdminId: string | null;
  createdAt: Date;
};

export type CreateSupportMessageInput = {
  userId: string;
  category: SupportCategory;
  message: string;
  createdAt: Date;
};

export type ListSupportTicketsFilters = PageRequest & {
  status?: SupportTicketStatus;
  category?: SupportCategory;
};

export interface SupportMessageRepositoryPort {
  create(input: CreateSupportMessageInput): Promise<SupportTicketView>;
  /** Whether the user sent any message from `since` on. */
  hasMessageSince(userId: string, since: Date): Promise<boolean>;
  findById(id: string): Promise<SupportTicketView | null>;
  countByStatus(status: SupportTicketStatus): Promise<number>;
  /** Newest first. */
  list(
    filters: ListSupportTicketsFilters,
  ): Promise<Paginated<SupportTicketView>>;
  reply(
    id: string,
    reply: { adminReply: string; repliedAt: Date; repliedByAdminId: string },
  ): Promise<SupportTicketView>;
  finalize(
    id: string,
    finalization: { finalizedAt: Date; finalizedByAdminId: string },
  ): Promise<SupportTicketView>;
}

export const SUPPORT_MESSAGE_REPOSITORY = Symbol("SUPPORT_MESSAGE_REPOSITORY");
