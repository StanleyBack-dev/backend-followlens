import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  REFERRAL_CLICK_REPOSITORY,
  REFERRAL_REWARD_REPOSITORY,
} from "@/modules/referrals/application/ports/referral-reward-repository.port";
import { ReferralsService } from "@/modules/referrals/application/referrals.service";
import { ReferralClickOrmEntity } from "@/modules/referrals/infrastructure/persistence/typeorm/entities/referral-click.orm-entity";
import { ReferralRewardOrmEntity } from "@/modules/referrals/infrastructure/persistence/typeorm/entities/referral-reward.orm-entity";
import { ReferralClickTypeormRepository } from "@/modules/referrals/infrastructure/persistence/typeorm/repositories/referral-click-typeorm.repository";
import { ReferralRewardTypeormRepository } from "@/modules/referrals/infrastructure/persistence/typeorm/repositories/referral-reward-typeorm.repository";
import { ReferralsController } from "@/modules/referrals/presentation/rest/referrals.controller";
import { UsersModule } from "@/modules/users/users.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([ReferralRewardOrmEntity, ReferralClickOrmEntity]),
    UsersModule,
  ],
  controllers: [ReferralsController],
  providers: [
    {
      provide: REFERRAL_REWARD_REPOSITORY,
      useClass: ReferralRewardTypeormRepository,
    },
    {
      provide: REFERRAL_CLICK_REPOSITORY,
      useClass: ReferralClickTypeormRepository,
    },
    ReferralsService,
  ],
  exports: [ReferralsService],
})
export class ReferralsModule {}
