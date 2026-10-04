import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CronSecretGuard } from "@/common/security/cron-secret.guard";
import {
  ACCOUNT_SETTINGS,
  accountSettingsFactory,
} from "@/modules/account/application/account.config";
import { CancelAccountDeletionUseCase } from "@/modules/account/application/use-cases/cancel-account-deletion.use-case";
import { GetAccountProfileUseCase } from "@/modules/account/application/use-cases/get-account-profile.use-case";
import { PurgeDeletedAccountsUseCase } from "@/modules/account/application/use-cases/purge-deleted-accounts.use-case";
import { RequestAccountDeletionUseCase } from "@/modules/account/application/use-cases/request-account-deletion.use-case";
import { UpdateAccountProfileUseCase } from "@/modules/account/application/use-cases/update-account-profile.use-case";
import { AccountController } from "@/modules/account/presentation/rest/account.controller";
import { InternalAccountController } from "@/modules/account/presentation/rest/internal-account.controller";
import { MailModule } from "@/modules/mails/mail.module";
import { UsersModule } from "@/modules/users/users.module";

@Module({
  imports: [UsersModule, MailModule],
  controllers: [AccountController, InternalAccountController],
  providers: [
    {
      provide: ACCOUNT_SETTINGS,
      useFactory: accountSettingsFactory,
      inject: [ConfigService],
    },
    GetAccountProfileUseCase,
    UpdateAccountProfileUseCase,
    RequestAccountDeletionUseCase,
    CancelAccountDeletionUseCase,
    PurgeDeletedAccountsUseCase,
    CronSecretGuard,
  ],
})
export class AccountModule {}
