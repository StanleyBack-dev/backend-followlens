import { HttpStatus } from "@nestjs/common";

export const accountErrors = {
  deletionConfirmationMismatch: {
    code: "ACCOUNT_DELETION_CONFIRMATION_MISMATCH",
    status: HttpStatus.BAD_REQUEST,
    message: "O e-mail de confirmação não confere com o da sua conta.",
  },
  activeSubscription: {
    code: "ACCOUNT_ACTIVE_SUBSCRIPTION",
    status: HttpStatus.CONFLICT,
    message:
      "Cancele sua assinatura Pro antes de excluir a conta, para que nenhuma cobrança nova seja gerada.",
  },
} as const;
