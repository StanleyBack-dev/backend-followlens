import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";
import type {
  CreateGatewayCustomerInput,
  CreateGatewaySubscriptionInput,
  CreatePixAutomaticAuthorizationInput,
  GatewaySubscription,
  PaymentGatewayPort,
  PixAutomaticAuthorization,
} from "@/modules/billing/application/ports/payment-gateway.port";

const SANDBOX_BASE_URL = "https://api-sandbox.asaas.com/v3";
const PRODUCTION_BASE_URL = "https://api.asaas.com/v3";
const TIMEOUT_MS = 20_000;

type AsaasError = { errors?: { code?: string; description?: string }[] };

@Injectable()
export class AsaasPaymentGatewayProvider implements PaymentGatewayPort {
  private readonly logger = new Logger(AsaasPaymentGatewayProvider.name);

  constructor(private readonly config: ConfigService) {}

  async createCustomer(input: CreateGatewayCustomerInput): Promise<string> {
    const customer = await this.request<{ id: string }>("/customers", {
      method: "POST",
      body: {
        name: input.name,
        email: input.email,
        cpfCnpj: input.cpfCnpj,
        externalReference: input.externalReference,
      },
    });
    return customer.id;
  }

  async createSubscription(
    input: CreateGatewaySubscriptionInput,
  ): Promise<GatewaySubscription> {
    const subscription = await this.request<{ id: string }>("/subscriptions", {
      method: "POST",
      body: {
        customer: input.gatewayCustomerId,
        // Lets the customer pick card, boleto or Pix on the hosted invoice.
        billingType: "UNDEFINED",
        value: input.value,
        nextDueDate: input.nextDueDate,
        cycle: input.cycle,
        description: input.description,
        externalReference: input.externalReference,
        ...(input.callbackSuccessUrl
          ? {
              callback: {
                successUrl: input.callbackSuccessUrl,
                autoRedirect: true,
              },
            }
          : {}),
      },
    });

    // The first charge is generated with the subscription; its hosted invoice
    // is the checkout page.
    const payments = await this.request<{
      data: { id: string; invoiceUrl?: string }[];
    }>(`/payments?subscription=${subscription.id}&limit=1`, { method: "GET" });

    return {
      gatewaySubscriptionId: subscription.id,
      checkoutUrl: payments.data[0]?.invoiceUrl ?? null,
    };
  }

  async cancelSubscription(gatewaySubscriptionId: string): Promise<void> {
    await this.request(`/subscriptions/${gatewaySubscriptionId}`, {
      method: "DELETE",
    });
  }

  // The authorization is created together with an immediate charge
  // (immediateQrCode) that both collects the first payment and registers the
  // payer's recurring consent; paymentCreationMode SUBSCRIPTION makes the
  // gateway generate the following charges by itself.
  async createPixAutomaticAuthorization(
    input: CreatePixAutomaticAuthorizationInput,
  ): Promise<PixAutomaticAuthorization> {
    const authorization = await this.request<{
      id: string;
      payload?: string;
      encodedImage?: string;
    }>("/pix/automatic/authorizations", {
      method: "POST",
      body: {
        customerId: input.gatewayCustomerId,
        frequency: input.frequency,
        contractId: input.contractId,
        startDate: input.startDate,
        value: input.value,
        description: input.description,
        paymentCreationMode: "SUBSCRIPTION",
        immediateQrCode: {
          originalValue: input.value,
          expirationSeconds: 3600,
          description: input.description,
        },
      },
    });

    return {
      pixAutomaticAuthorizationId: authorization.id,
      qrCodePayload: authorization.payload ?? null,
      qrCodeImage: authorization.encodedImage ?? null,
    };
  }

  async cancelPixAutomaticAuthorization(
    pixAutomaticAuthorizationId: string,
  ): Promise<void> {
    await this.request(
      `/pix/automatic/authorizations/${pixAutomaticAuthorizationId}`,
      { method: "DELETE" },
    );
  }

  private async request<T>(
    path: string,
    options: { method: "GET" | "POST" | "DELETE"; body?: unknown },
  ): Promise<T> {
    const apiKey = this.config.get<string>("ASAAS_API_KEY");
    if (!apiKey) {
      throw AppException.from(
        APP_ERRORS.billing.gatewayNotConfigured,
        undefined,
      );
    }
    const baseUrl =
      this.config.get<string>("ASAAS_ENVIRONMENT") === "production"
        ? PRODUCTION_BASE_URL
        : SANDBOX_BASE_URL;

    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method: options.method,
        headers: {
          "content-type": "application/json",
          "user-agent": "followlens-backend",
          access_token: apiKey,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.error(
        `Falha de rede ao chamar a Asaas (${path}): ${error instanceof Error ? error.message : "unknown"}`,
      );
      throw AppException.from(APP_ERRORS.billing.gatewayRequestFailed, {});
    }

    const payload = (await response.json().catch(() => undefined)) as unknown;
    if (!response.ok) {
      this.logger.error(
        `Erro da API Asaas em ${path} (status ${response.status}): ${JSON.stringify(payload)}`,
      );
      // A 400 carries a customer-facing reason (e.g. invalid CPF).
      const reason =
        response.status === 400
          ? (payload as AsaasError | undefined)?.errors?.[0]?.description
          : undefined;
      throw AppException.from(APP_ERRORS.billing.gatewayRequestFailed, {
        reason,
      });
    }
    return payload as T;
  }
}
