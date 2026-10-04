import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  SetMetadata,
} from "@nestjs/common";
import { Public } from "@/common/decorators/public.decorator";
import { SKIP_INTERNAL_KEY } from "@/common/security/internal-api-key.guard";
import {
  type AsaasWebhookPayload,
  HandleAsaasWebhookUseCase,
} from "@/modules/billing/application/use-cases/handle-asaas-webhook.use-case";

// Called by the gateway directly (not through the BFF), so it skips both the
// internal key and the user session: ASAAS_WEBHOOK_TOKEN is the credential.
@Controller("webhooks/asaas")
export class AsaasWebhookController {
  constructor(private readonly handleWebhook: HandleAsaasWebhookUseCase) {}

  @Public()
  @SetMetadata(SKIP_INTERNAL_KEY, true)
  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(
    @Headers("asaas-access-token") token: string | undefined,
    @Body() payload: AsaasWebhookPayload,
  ): Promise<{ received: true }> {
    await this.handleWebhook.execute(token, payload);
    return { received: true };
  }
}
