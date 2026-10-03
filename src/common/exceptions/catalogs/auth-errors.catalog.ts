import { HttpStatus } from "@nestjs/common";

export const authErrors = {
  accessTokenMissing: {
    code: "AUTH_ACCESS_TOKEN_MISSING",
    status: HttpStatus.UNAUTHORIZED,
    message: "Sessão ausente ou expirada.",
  },
  invalidInternalKey: {
    code: "AUTH_INVALID_INTERNAL_KEY",
    status: HttpStatus.UNAUTHORIZED,
    message: "Requisição não autorizada.",
  },
  invalidCronSecret: {
    code: "AUTH_INVALID_CRON_SECRET",
    status: HttpStatus.UNAUTHORIZED,
    message: "Requisição de agendamento não autorizada.",
  },
  googleNotConfigured: {
    code: "AUTH_GOOGLE_NOT_CONFIGURED",
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message: "Login com Google não configurado (GOOGLE_CLIENT_ID).",
  },
  googleTokenInvalid: {
    code: "AUTH_GOOGLE_TOKEN_INVALID",
    status: HttpStatus.UNAUTHORIZED,
    message: "Não foi possível validar o login com o Google. Tente novamente.",
  },
  googleEmailNotVerified: {
    code: "AUTH_GOOGLE_EMAIL_NOT_VERIFIED",
    status: HttpStatus.UNAUTHORIZED,
    message: "O e-mail da sua conta Google não está verificado.",
  },
  ownerOnly: {
    code: "AUTH_OWNER_ONLY",
    status: HttpStatus.FORBIDDEN,
    message: "Recurso disponível apenas para o administrador.",
  },
  adminOnly: {
    code: "AUTH_ADMIN_ONLY",
    status: HttpStatus.FORBIDDEN,
    message: "Recurso disponível apenas para administradores.",
  },
  cannotChangeMaster: {
    code: "AUTH_CANNOT_CHANGE_MASTER",
    status: HttpStatus.FORBIDDEN,
    message: "O administrador master não pode ser alterado.",
  },
  userNotFound: {
    code: "USER_NOT_FOUND",
    status: HttpStatus.NOT_FOUND,
    message: "Usuário não encontrado.",
  },
} as const;
