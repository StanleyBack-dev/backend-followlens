import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { PaginationQueryDto } from "@/common/dtos/pagination-query.dto";
import type { RequestUser } from "@/modules/auth/presentation/guards/user-session.guard";
import type { BillingPaymentView } from "@/modules/billing/application/ports/billing-payment-repository.port";
import { CancelSubscriptionUseCase } from "@/modules/billing/application/use-cases/cancel-subscription.use-case";
import {
  GetMySubscriptionUseCase,
  type SubscriptionSummary,
} from "@/modules/billing/application/use-cases/get-my-subscription.use-case";
import { ListMyPaymentsUseCase } from "@/modules/billing/application/use-cases/list-my-payments.use-case";
import {
  SubscribeToProUseCase,
  type SubscribeToProResult,
} from "@/modules/billing/application/use-cases/subscribe-to-pro.use-case";
import {
  CancelSubscriptionDto,
  SubscribeToProDto,
} from "@/modules/billing/presentation/rest/dtos/billing.dtos";
import type { Paginated } from "@/shared/application/pagination";

// Self-service: every route acts on the signed-in user's own subscription.
@Controller("billing")
export class BillingController {
  constructor(
    private readonly getSubscription: GetMySubscriptionUseCase,
    private readonly subscribeToPro: SubscribeToProUseCase,
    private readonly cancelSubscription: CancelSubscriptionUseCase,
    private readonly listPayments: ListMyPaymentsUseCase,
  ) {}

  @Get("subscription")
  subscription(@CurrentUser() user: RequestUser): Promise<SubscriptionSummary> {
    return this.getSubscription.execute(user);
  }

  @Post("subscribe")
  @HttpCode(HttpStatus.OK)
  subscribe(
    @CurrentUser() user: RequestUser,
    @Body() body: SubscribeToProDto,
  ): Promise<SubscribeToProResult> {
    return this.subscribeToPro.execute(user.id, body);
  }

  @Post("cancel")
  @HttpCode(HttpStatus.OK)
  async cancel(
    @CurrentUser() user: RequestUser,
    @Body() body: CancelSubscriptionDto,
  ): Promise<SubscriptionSummary> {
    await this.cancelSubscription.execute(user, body);
    return this.getSubscription.execute(user);
  }

  @Get("payments")
  payments(
    @CurrentUser() user: RequestUser,
    @Query() query: PaginationQueryDto,
  ): Promise<Paginated<BillingPaymentView>> {
    return this.listPayments.execute(user.id, query);
  }
}
