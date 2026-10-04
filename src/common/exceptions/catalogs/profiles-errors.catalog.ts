import { HttpStatus } from "@nestjs/common";

export const profilesErrors = {
  notFound: {
    code: "PROFILE_NOT_FOUND",
    status: HttpStatus.NOT_FOUND,
    message: "Perfil não encontrado.",
  },
  limitReached: {
    code: "PROFILE_LIMIT_REACHED",
    status: HttpStatus.FORBIDDEN,
    message: (params: { limit: number; pro: boolean }) =>
      params.pro
        ? `Seu plano permite até ${params.limit} perfis.`
        : `O plano Free permite ${params.limit} perfil. Assine o Pro para acompanhar mais perfis.`,
  },
  cannotDeleteDefault: {
    code: "PROFILE_CANNOT_DELETE_DEFAULT",
    status: HttpStatus.CONFLICT,
    message: "O perfil principal não pode ser excluído, apenas renomeado.",
  },
} as const;
