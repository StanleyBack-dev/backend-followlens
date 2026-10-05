import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SUMMARY_EMAIL_LOG } from "@/modules/engagement/application/ports/summary-email-log.port";
import { GetAchievementsUseCase } from "@/modules/engagement/application/use-cases/get-achievements.use-case";
import { GetMonthlySummaryUseCase } from "@/modules/engagement/application/use-cases/get-monthly-summary.use-case";
import { SendMonthlySummariesUseCase } from "@/modules/engagement/application/use-cases/send-monthly-summaries.use-case";
import { MonthlySummaryEmailOrmEntity } from "@/modules/engagement/infrastructure/persistence/typeorm/entities/monthly-summary-email.orm-entity";
import { SummaryEmailLogTypeormRepository } from "@/modules/engagement/infrastructure/persistence/typeorm/repositories/summary-email-log-typeorm.repository";
import { EngagementController } from "@/modules/engagement/presentation/rest/engagement.controller";
import { FollowersModule } from "@/modules/followers/followers.module";
import { ImportsModule } from "@/modules/imports/imports.module";
import { MailModule } from "@/modules/mails/mail.module";
import { ProfilesModule } from "@/modules/profiles/profiles.module";
import { ReferralsModule } from "@/modules/referrals/referrals.module";
import { UsersModule } from "@/modules/users/users.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([MonthlySummaryEmailOrmEntity]),
    ImportsModule,
    FollowersModule,
    ProfilesModule,
    ReferralsModule,
    UsersModule,
    MailModule,
  ],
  controllers: [EngagementController],
  providers: [
    { provide: SUMMARY_EMAIL_LOG, useClass: SummaryEmailLogTypeormRepository },
    GetAchievementsUseCase,
    GetMonthlySummaryUseCase,
    SendMonthlySummariesUseCase,
  ],
  // The daily maintenance job sends the summaries.
  exports: [SendMonthlySummariesUseCase],
})
export class EngagementModule {}
