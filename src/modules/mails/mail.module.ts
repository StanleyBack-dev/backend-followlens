import { Module } from "@nestjs/common";
import { MAIL_PROVIDER } from "@/modules/mails/application/ports/mail-provider.port";
import { SendAccountDeletionEmailUseCase } from "@/modules/mails/application/use-cases/send-account-deletion-email.use-case";
import { SendUnfollowAlertEmailUseCase } from "@/modules/mails/application/use-cases/send-unfollow-alert-email.use-case";
import { SendWelcomeEmailUseCase } from "@/modules/mails/application/use-cases/send-welcome-email.use-case";
import { BrevoMailProvider } from "@/modules/mails/infrastructure/providers/brevo-mail.provider";

@Module({
  providers: [
    { provide: MAIL_PROVIDER, useClass: BrevoMailProvider },
    SendUnfollowAlertEmailUseCase,
    SendWelcomeEmailUseCase,
    SendAccountDeletionEmailUseCase,
  ],
  exports: [
    SendUnfollowAlertEmailUseCase,
    SendWelcomeEmailUseCase,
    SendAccountDeletionEmailUseCase,
  ],
})
export class MailModule {}
