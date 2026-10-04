import { HttpStatus } from "@nestjs/common";

export const supportErrors = {
  dailyLimitReached: {
    code: "SUPPORT_DAILY_LIMIT_REACHED",
    status: HttpStatus.CONFLICT,
    message:
      "Você já enviou uma mensagem de suporte hoje. Tente novamente amanhã.",
  },
  ticketNotFound: {
    code: "SUPPORT_TICKET_NOT_FOUND",
    status: HttpStatus.NOT_FOUND,
    message: "Chamado de suporte não encontrado.",
  },
  ticketAlreadyResolved: {
    code: "SUPPORT_TICKET_ALREADY_RESOLVED",
    status: HttpStatus.CONFLICT,
    message: "Este chamado já foi finalizado.",
  },
  ticketNotAnswered: {
    code: "SUPPORT_TICKET_NOT_ANSWERED",
    status: HttpStatus.CONFLICT,
    message: "Responda o chamado antes de finalizá-lo.",
  },
} as const;
