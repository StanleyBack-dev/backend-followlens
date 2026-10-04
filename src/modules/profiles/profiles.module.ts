import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PROFILE_REPOSITORY } from "@/modules/profiles/application/ports/profile-repository.port";
import { ProfileAccessService } from "@/modules/profiles/application/profile-access.service";
import { ManageProfilesUseCase } from "@/modules/profiles/application/use-cases/manage-profiles.use-case";
import { ProfileOrmEntity } from "@/modules/profiles/infrastructure/persistence/typeorm/entities/profile.orm-entity";
import { ProfileTypeormRepository } from "@/modules/profiles/infrastructure/persistence/typeorm/repositories/profile-typeorm.repository";
import { ProfilesController } from "@/modules/profiles/presentation/rest/profiles.controller";
import { planLimitsProvider } from "@/shared/application/plan-limits.config";

@Module({
  imports: [TypeOrmModule.forFeature([ProfileOrmEntity])],
  controllers: [ProfilesController],
  providers: [
    planLimitsProvider,
    { provide: PROFILE_REPOSITORY, useClass: ProfileTypeormRepository },
    ProfileAccessService,
    ManageProfilesUseCase,
  ],
  // The other contexts only need to know which profile a request acts on.
  exports: [ProfileAccessService],
})
export class ProfilesModule {}
