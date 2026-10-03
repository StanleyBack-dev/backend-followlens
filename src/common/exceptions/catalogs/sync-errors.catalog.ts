import { HttpStatus } from "@nestjs/common";

export const syncErrors = {
  alreadyRunning: {
    code: "SYNC_ALREADY_RUNNING",
    status: HttpStatus.CONFLICT,
    message: "Já existe uma sincronização em andamento.",
  },
  manualDailyLimitReached: {
    code: "SYNC_MANUAL_DAILY_LIMIT_REACHED",
    status: HttpStatus.TOO_MANY_REQUESTS,
    message: "Limite diário de sincronização manual atingido.",
  },
  alreadySyncedToday: {
    code: "SYNC_ALREADY_SYNCED_TODAY",
    status: HttpStatus.TOO_MANY_REQUESTS,
    message: "A lista de seguidores já foi sincronizada hoje.",
  },
  minIntervalNotElapsed: {
    code: "SYNC_MIN_INTERVAL_NOT_ELAPSED",
    status: HttpStatus.TOO_MANY_REQUESTS,
    message: "Aguarde o intervalo mínimo entre sincronizações.",
  },
  integrationBlocked: {
    code: "SYNC_INTEGRATION_BLOCKED",
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message:
      "Integração com o Instagram pausada por segurança. Atualize os cookies da sessão e faça o redeploy.",
  },
  notConfigured: {
    code: "SYNC_INSTAGRAM_NOT_CONFIGURED",
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message:
      "Sessão do Instagram não configurada. Defina INSTAGRAM_SESSION_ID, INSTAGRAM_CSRF_TOKEN e INSTAGRAM_DS_USER_ID.",
  },
} as const;
