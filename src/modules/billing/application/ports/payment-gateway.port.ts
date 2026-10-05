export type CreateGatewayCustomerInput = {
  name: string;
  email: string;
  cpfCnpj: string;
  externalReference: string;
};

export type CreateGatewaySubscriptionInput = {
  gatewayCustomerId: string;
  value: number;
  /** YYYY-MM-DD of the first charge. */
  nextDueDate: string;
  cycle: "MONTHLY" | "YEARLY";
  description: string;
  externalReference: string;
  /** Where the hosted invoice sends the customer back after paying. */
  callbackSuccessUrl?: string;
};

export type GatewaySubscription = {
  gatewaySubscriptionId: string;
  /** Hosted invoice of the first charge. */
  checkoutUrl: string | null;
};

export type CreatePixAutomaticAuthorizationInput = {
  gatewayCustomerId: string;
  value: number;
  frequency: "MONTHLY" | "ANNUALLY";
  /** Max 35 chars at the gateway. */
  contractId: string;
  startDate: string;
  description: string;
};

export type PixAutomaticAuthorization = {
  pixAutomaticAuthorizationId: string;
  qrCodePayload: string | null;
  /** Base64 PNG. */
  qrCodeImage: string | null;
};

export interface PaymentGatewayPort {
  /** Returns the gateway's customer id. */
  createCustomer(input: CreateGatewayCustomerInput): Promise<string>;
  createSubscription(
    input: CreateGatewaySubscriptionInput,
  ): Promise<GatewaySubscription>;
  cancelSubscription(gatewaySubscriptionId: string): Promise<void>;
  /**
   * Moves the subscription's next charge (and any charge already open) by
   * `days`; negative moves it back.
   */
  shiftNextCharge(gatewaySubscriptionId: string, days: number): Promise<void>;
  createPixAutomaticAuthorization(
    input: CreatePixAutomaticAuthorizationInput,
  ): Promise<PixAutomaticAuthorization>;
  cancelPixAutomaticAuthorization(
    pixAutomaticAuthorizationId: string,
  ): Promise<void>;
}

export const PAYMENT_GATEWAY = Symbol("PAYMENT_GATEWAY");
