import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminGuard } from "@/common/security/admin.guard";
import { MailModule } from "@/modules/mails/mail.module";
import { SUPPORT_MESSAGE_REPOSITORY } from "@/modules/support/application/ports/support-message-repository.port";
import { ManageSupportTicketsUseCase } from "@/modules/support/application/use-cases/manage-support-tickets.use-case";
import { SendSupportMessageUseCase } from "@/modules/support/application/use-cases/send-support-message.use-case";
import { SupportMessageOrmEntity } from "@/modules/support/infrastructure/persistence/typeorm/entities/support-message.orm-entity";
import { SupportMessageTypeormRepository } from "@/modules/support/infrastructure/persistence/typeorm/repositories/support-message-typeorm.repository";
import { AdminSupportController } from "@/modules/support/presentation/rest/admin-support.controller";
import { SupportController } from "@/modules/support/presentation/rest/support.controller";
import { UsersModule } from "@/modules/users/users.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([SupportMessageOrmEntity]),
    UsersModule,
    MailModule,
  ],
  controllers: [SupportController, AdminSupportController],
  providers: [
    AdminGuard,
    {
      provide: SUPPORT_MESSAGE_REPOSITORY,
      useClass: SupportMessageTypeormRepository,
    },
    SendSupportMessageUseCase,
    ManageSupportTicketsUseCase,
  ],
  // The admin dashboard shows how many tickets are waiting.
  exports: [ManageSupportTicketsUseCase],
})
export class SupportModule {}
