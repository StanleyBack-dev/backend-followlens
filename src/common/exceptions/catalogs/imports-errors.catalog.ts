import { HttpStatus } from "@nestjs/common";

export const importsErrors = {
  fileTooLarge: {
    code: "IMPORT_FILE_TOO_LARGE",
    status: HttpStatus.PAYLOAD_TOO_LARGE,
    message: (params: { maxMb: number }) =>
      `Arquivo acima do limite de ${params.maxMb} MB.`,
  },
  invalidFile: {
    code: "IMPORT_INVALID_FILE",
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    message:
      "Não foi possível ler a lista de seguidores no arquivo enviado. Envie o .zip ou o .json de 'Seguidores' exportado pelo Instagram.",
  },
  emptyFollowers: {
    code: "IMPORT_EMPTY_FOLLOWERS",
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    message:
      "Nenhum seguidor foi encontrado no arquivo. Verifique se exportou 'Seguidores e seguindo' no formato correto.",
  },
  snapshotRejected: {
    code: "IMPORT_SNAPSHOT_REJECTED",
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    message: (params: { reason: string }) => params.reason,
  },
  dailyLimitReached: {
    code: "IMPORT_DAILY_LIMIT_REACHED",
    status: HttpStatus.TOO_MANY_REQUESTS,
    message: "Limite diário de importações atingido. Tente novamente amanhã.",
  },
  planIntervalNotElapsed: {
    code: "IMPORT_PLAN_INTERVAL_NOT_ELAPSED",
    status: HttpStatus.TOO_MANY_REQUESTS,
    message: (params: { days: number }) =>
      `No plano Free é possível importar uma vez a cada ${params.days} dias. Assine o Pro para importar sem espera.`,
  },
  alreadyRunning: {
    code: "IMPORT_ALREADY_RUNNING",
    status: HttpStatus.CONFLICT,
    message: "Já existe uma importação em andamento.",
  },
} as const;
