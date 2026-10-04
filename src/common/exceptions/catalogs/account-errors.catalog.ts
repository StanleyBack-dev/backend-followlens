import { HttpStatus } from "@nestjs/common";

export const accountErrors = {
  deletionConfirmationMismatch: {
    code: "ACCOUNT_DELETION_CONFIRMATION_MISMATCH",
    status: HttpStatus.BAD_REQUEST,
    message: "O e-mail de confirmação não confere com o da sua conta.",
  },
} as const;
