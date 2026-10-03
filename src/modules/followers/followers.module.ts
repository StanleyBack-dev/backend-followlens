import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FOLLOWER_REPOSITORY } from "@/modules/followers/application/ports/follower-repository.port";
import { ApplyFollowerSnapshotUseCase } from "@/modules/followers/application/use-cases/apply-follower-snapshot.use-case";
import { GetFollowersOverviewUseCase } from "@/modules/followers/application/use-cases/get-followers-overview.use-case";
import { ListFollowerEventsUseCase } from "@/modules/followers/application/use-cases/list-follower-events.use-case";
import { ListFollowerFilterOptionsUseCase } from "@/modules/followers/application/use-cases/list-follower-filter-options.use-case";
import { ListFollowersUseCase } from "@/modules/followers/application/use-cases/list-followers.use-case";
import { UnfollowAlertsUseCase } from "@/modules/followers/application/use-cases/unfollow-alerts.use-case";
import { FollowerEventOrmEntity } from "@/modules/followers/infrastructure/persistence/typeorm/entities/follower-event.orm-entity";
import { FollowerOrmEntity } from "@/modules/followers/infrastructure/persistence/typeorm/entities/follower.orm-entity";
import { FollowerTypeormRepository } from "@/modules/followers/infrastructure/persistence/typeorm/repositories/follower-typeorm.repository";
import { FollowersController } from "@/modules/followers/presentation/rest/followers.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([FollowerOrmEntity, FollowerEventOrmEntity]),
  ],
  controllers: [FollowersController],
  providers: [
    { provide: FOLLOWER_REPOSITORY, useClass: FollowerTypeormRepository },
    ApplyFollowerSnapshotUseCase,
    GetFollowersOverviewUseCase,
    ListFollowersUseCase,
    ListFollowerEventsUseCase,
    ListFollowerFilterOptionsUseCase,
    UnfollowAlertsUseCase,
  ],
  // Public API of this bounded context — the sync module only sees these.
  exports: [
    ApplyFollowerSnapshotUseCase,
    GetFollowersOverviewUseCase,
    UnfollowAlertsUseCase,
  ],
})
export class FollowersModule {}
