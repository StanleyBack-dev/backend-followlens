import { HttpStatus } from "@nestjs/common";

export const billingErrors = {
  proRequired: {
    code: "BILLING_PRO_REQUIRED",
    status: HttpStatus.FORBIDDEN,
    message: "Recurso disponível apenas no plano Pro.",
  },
  alreadySubscribed: {
    code: "BILLING_ALREADY_SUBSCRIBED",
    status: HttpStatus.CONFLICT,
    message: "Você já tem uma assinatura Pro ativa.",
  },
  noActiveSubscription: {
    code: "BILLING_NO_ACTIVE_SUBSCRIPTION",
    status: HttpStatus.CONFLICT,
    message: "Não há assinatura ativa para cancelar.",
  },
  paymentMethodUnavailable: {
    code: "BILLING_PAYMENT_METHOD_UNAVAILABLE",
    status: HttpStatus.BAD_REQUEST,
    message: "Esta forma de pagamento não está disponível no momento.",
  },
  gatewayNotConfigured: {
    code: "BILLING_GATEWAY_NOT_CONFIGURED",
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message: "Pagamentos não configurados. Verifique a variável ASAAS_API_KEY.",
  },
  gatewayRequestFailed: {
    code: "BILLING_GATEWAY_REQUEST_FAILED",
    status: HttpStatus.BAD_GATEWAY,
    message: (params: { reason?: string }) =>
      params.reason ??
      "Não foi possível falar com o provedor de pagamento. Tente novamente.",
  },
  invalidWebhookToken: {
    code: "BILLING_INVALID_WEBHOOK_TOKEN",
    status: HttpStatus.UNAUTHORIZED,
    message: "Webhook não autorizado.",
  },
} as const;
