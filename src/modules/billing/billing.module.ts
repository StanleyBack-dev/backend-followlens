import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  BILLING_SETTINGS,
  billingSettingsFactory,
} from "@/modules/billing/application/billing.config";
import { AdminSubscriptionsQuery } from "@/modules/billing/application/admin-subscriptions.query";
import { BILLING_PAYMENT_REPOSITORY } from "@/modules/billing/application/ports/billing-payment-repository.port";
import { PAYMENT_GATEWAY } from "@/modules/billing/application/ports/payment-gateway.port";
import { SUBSCRIPTION_REPOSITORY } from "@/modules/billing/application/ports/subscription-repository.port";
import { ProDaysService } from "@/modules/billing/application/pro-days.service";
import { ReferralRewardCoordinator } from "@/modules/billing/application/referral-reward.coordinator";
import { RenewingSubscriptionChecker } from "@/modules/billing/application/renewing-subscription.checker";
import { SubscriptionPlanService } from "@/modules/billing/application/subscription-plan.service";
import { CancelSubscriptionUseCase } from "@/modules/billing/application/use-cases/cancel-subscription.use-case";
import { GetMySubscriptionUseCase } from "@/modules/billing/application/use-cases/get-my-subscription.use-case";
import { HandleAsaasWebhookUseCase } from "@/modules/billing/application/use-cases/handle-asaas-webhook.use-case";
import { ListMyPaymentsUseCase } from "@/modules/billing/application/use-cases/list-my-payments.use-case";
import { RunSubscriptionLifecycleUseCase } from "@/modules/billing/application/use-cases/run-subscription-lifecycle.use-case";
import { SubscribeToProUseCase } from "@/modules/billing/application/use-cases/subscribe-to-pro.use-case";
import { AsaasPaymentGatewayProvider } from "@/modules/billing/infrastructure/gateways/asaas-payment-gateway.provider";
import { BillingPaymentOrmEntity } from "@/modules/billing/infrastructure/persistence/typeorm/entities/billing-payment.orm-entity";
import { SubscriptionCancellationOrmEntity } from "@/modules/billing/infrastructure/persistence/typeorm/entities/subscription-cancellation.orm-entity";
import { SubscriptionOrmEntity } from "@/modules/billing/infrastructure/persistence/typeorm/entities/subscription.orm-entity";
import { BillingPaymentTypeormRepository } from "@/modules/billing/infrastructure/persistence/typeorm/repositories/billing-payment-typeorm.repository";
import { SubscriptionTypeormRepository } from "@/modules/billing/infrastructure/persistence/typeorm/repositories/subscription-typeorm.repository";
import { AsaasWebhookController } from "@/modules/billing/presentation/rest/asaas-webhook.controller";
import { BillingController } from "@/modules/billing/presentation/rest/billing.controller";
import { MailModule } from "@/modules/mails/mail.module";
import { ReferralsModule } from "@/modules/referrals/referrals.module";
import { UsersModule } from "@/modules/users/users.module";
import { planLimitsProvider } from "@/shared/application/plan-limits.config";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SubscriptionOrmEntity,
      BillingPaymentOrmEntity,
      SubscriptionCancellationOrmEntity,
    ]),
    UsersModule,
    MailModule,
    ReferralsModule,
  ],
  controllers: [BillingController, AsaasWebhookController],
  providers: [
    {
      provide: BILLING_SETTINGS,
      useFactory: billingSettingsFactory,
      inject: [ConfigService],
    },
    planLimitsProvider,
    {
      provide: SUBSCRIPTION_REPOSITORY,
      useClass: SubscriptionTypeormRepository,
    },
    {
      provide: BILLING_PAYMENT_REPOSITORY,
      useClass: BillingPaymentTypeormRepository,
    },
    { provide: PAYMENT_GATEWAY, useClass: AsaasPaymentGatewayProvider },
    SubscriptionPlanService,
    ProDaysService,
    ReferralRewardCoordinator,
    RenewingSubscriptionChecker,
    GetMySubscriptionUseCase,
    SubscribeToProUseCase,
    CancelSubscriptionUseCase,
    ListMyPaymentsUseCase,
    HandleAsaasWebhookUseCase,
    RunSubscriptionLifecycleUseCase,
    AdminSubscriptionsQuery,
  ],
  // Public API of this bounded context.
  exports: [
    RenewingSubscriptionChecker,
    RunSubscriptionLifecycleUseCase,
    AdminSubscriptionsQuery,
  ],
})
export class BillingModule {}
