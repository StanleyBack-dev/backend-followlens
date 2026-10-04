export enum PaymentMethod {
  /** Asaas hosted invoice: card, boleto or Pix chosen by the customer. */
  CHECKOUT = "checkout",
  /** Pix Automático: one authorization, then recurring Pix debits. */
  PIX_AUTOMATIC = "pix_automatic",
}
