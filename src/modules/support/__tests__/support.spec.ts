import type { SendSupportEmailsUseCase } from "@/modules/mails/application/use-cases/send-support-emails.use-case";
import type {
  SupportMessageRepositoryPort,
  SupportTicketView,
} from "@/modules/support/application/ports/support-message-repository.port";
import { ManageSupportTicketsUseCase } from "@/modules/support/application/use-cases/manage-support-tickets.use-case";
import { SendSupportMessageUseCase } from "@/modules/support/application/use-cases/send-support-message.use-case";
import {
  SupportCategory,
  SupportTicketStatus,
} from "@/modules/support/domain/support.enums";
import type { UserRepositoryPort } from "@/modules/users/application/ports/user-repository.port";
import type { ClockPort } from "@/shared/application/ports/clock.port";

const NOW = new Date("2026-10-04T15:00:00.000Z");
const START_OF_TOMORROW = new Date("2026-10-05T03:00:00.000Z");
const USER = { id: "u-1", email: "ana@test.com", name: "Ana Souza" };
const ADMIN = { id: "a-1", email: "admin@test.com", name: "Admin" };

function setup(
  options: {
    sentToday?: boolean;
    status?: SupportTicketStatus;
    mailFails?: boolean;
  } = {},
) {
  let ticket: SupportTicketView = {
    id: "t-1",
    userId: USER.id,
    protocolNumber: 42,
    category: SupportCategory.DOUBT,
    message: "Como importo?",
    status: options.status ?? SupportTicketStatus.OPEN,
    adminReply: null,
    repliedAt: null,
    repliedByAdminId: null,
    finalizedAt: null,
    finalizedByAdminId: null,
    createdAt: NOW,
  };
  const messages = {
    hasMessageSince: jest.fn(async () => options.sentToday ?? false),
    create: jest.fn(async (input) => {
      ticket = { ...ticket, ...input };
      return ticket;
    }),
    findById: jest.fn(async (id: string) => (id === ticket.id ? ticket : null)),
    reply: jest.fn(async (_id: string, reply) => {
      ticket = { ...ticket, ...reply, status: SupportTicketStatus.ANSWERED };
      return ticket;
    }),
    finalize: jest.fn(async (_id: string, finalization) => {
      ticket = {
        ...ticket,
        ...finalization,
        status: SupportTicketStatus.RESOLVED,
      };
      return ticket;
    }),
  } as unknown as SupportMessageRepositoryPort & Record<string, jest.Mock>;
  const users = {
    findById: jest.fn(async (id: string) => (id === USER.id ? USER : ADMIN)),
    findByIds: jest.fn(async () => [USER, ADMIN]),
  } as unknown as UserRepositoryPort;
  const clock = {
    now: () => NOW,
    startOfNextLocalDay: () => START_OF_TOMORROW,
  } as unknown as ClockPort;
  const fail = async () => {
    if (options.mailFails) throw new Error("brevo down");
  };
  const emails = {
    confirmation: jest.fn(fail),
    notification: jest.fn(fail),
    reply: jest.fn(fail),
    finalized: jest.fn(fail),
  } as unknown as SendSupportEmailsUseCase & Record<string, jest.Mock>;

  return {
    messages,
    emails,
    send: new SendSupportMessageUseCase(messages, users, clock, emails),
    manage: new ManageSupportTicketsUseCase(messages, users, clock, emails),
  };
}

describe("support", () => {
  it("opens a ticket and e-mails both the team and the user", async () => {
    const { send, messages, emails } = setup();

    const sent = await send.execute(USER.id, {
      category: SupportCategory.BILLING,
      message: "  Cobrança duplicada  ",
    });

    expect(messages.hasMessageSince).toHaveBeenCalledWith(
      USER.id,
      new Date("2026-10-04T03:00:00.000Z"),
    );
    expect(sent).toMatchObject({
      protocolNumber: 42,
      message: "Cobrança duplicada",
    });
    expect(emails.notification).toHaveBeenCalledTimes(1);
    expect(emails.confirmation).toHaveBeenCalledWith(
      USER,
      expect.objectContaining({
        protocol: "#000042",
        categoryLabel: "Financeiro / Cobrança",
      }),
    );
  });

  it("allows one message per day and says when the next is allowed", async () => {
    const { send, messages } = setup({ sentToday: true });

    await expect(send.status(USER.id)).resolves.toEqual({
      canSend: false,
      nextAllowedAt: START_OF_TOMORROW,
    });
    await expect(
      send.execute(USER.id, {
        category: SupportCategory.DOUBT,
        message: "Outra",
      }),
    ).rejects.toMatchObject({
      response: { code: "SUPPORT_DAILY_LIMIT_REACHED" },
    });
    expect(messages.create).not.toHaveBeenCalled();
  });

  it("keeps the ticket when the e-mails fail", async () => {
    const { send } = setup({ mailFails: true });

    await expect(
      send.execute(USER.id, { category: SupportCategory.DOUBT, message: "Oi" }),
    ).resolves.toMatchObject({ protocolNumber: 42 });
  });

  it("replies, notifies the user and marks the ticket answered", async () => {
    const { manage, emails } = setup();

    const ticket = await manage.reply(
      ADMIN.id,
      "t-1",
      "  Veja o passo a passo.  ",
    );

    expect(ticket).toMatchObject({
      status: SupportTicketStatus.ANSWERED,
      adminReply: "Veja o passo a passo.",
      repliedByAdminId: ADMIN.id,
      userEmail: USER.email,
    });
    expect(emails.reply).toHaveBeenCalledWith(
      USER,
      expect.objectContaining({ protocol: "#000042" }),
      "Veja o passo a passo.",
    );
  });

  it("only finalizes a ticket that was answered", async () => {
    const open = setup();
    await expect(open.manage.finalize(ADMIN.id, "t-1")).rejects.toMatchObject({
      response: { code: "SUPPORT_TICKET_NOT_ANSWERED" },
    });
    expect(open.messages.finalize).not.toHaveBeenCalled();

    const answered = setup({ status: SupportTicketStatus.ANSWERED });
    const ticket = await answered.manage.finalize(ADMIN.id, "t-1");
    expect(ticket).toMatchObject({
      status: SupportTicketStatus.RESOLVED,
      finalizedByAdminId: ADMIN.id,
      finalizedByName: ADMIN.name,
    });
    expect(answered.emails.finalized).toHaveBeenCalledTimes(1);
  });

  it("refuses to change a ticket that is already finalized", async () => {
    const { manage } = setup({ status: SupportTicketStatus.RESOLVED });

    await expect(manage.reply(ADMIN.id, "t-1", "Oi")).rejects.toMatchObject({
      response: { code: "SUPPORT_TICKET_ALREADY_RESOLVED" },
    });
    await expect(manage.finalize(ADMIN.id, "t-1")).rejects.toMatchObject({
      response: { code: "SUPPORT_TICKET_ALREADY_RESOLVED" },
    });
  });

  it("answers not found for an unknown ticket", async () => {
    const { manage } = setup();

    await expect(manage.get("nope")).rejects.toMatchObject({
      response: { code: "SUPPORT_TICKET_NOT_FOUND" },
    });
  });
});
