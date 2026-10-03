import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CronSecretGuard } from "@/common/security/cron-secret.guard";
import { FollowersModule } from "@/modules/followers/followers.module";
import { InstagramModule } from "@/modules/instagram/instagram.module";
import { NotificationsModule } from "@/modules/notifications/notifications.module";
import { UsersModule } from "@/modules/users/users.module";
import { OwnerResolverService } from "@/modules/sync/application/services/owner-resolver.service";
import { INTEGRATION_STATE_REPOSITORY } from "@/modules/sync/application/ports/integration-state-repository.port";
import { SYNC_RUN_REPOSITORY } from "@/modules/sync/application/ports/sync-run-repository.port";
import { IntegrationGuardService } from "@/modules/sync/application/services/integration-guard.service";
import { SyncCoordinatorService } from "@/modules/sync/application/services/sync-coordinator.service";
import { SyncEngineService } from "@/modules/sync/application/services/sync-engine.service";
import {
  SYNC_SETTINGS,
  syncSettingsFactory,
} from "@/modules/sync/application/sync.config";
import { GetSyncStatusUseCase } from "@/modules/sync/application/use-cases/get-sync-status.use-case";
import { ListSyncRunsUseCase } from "@/modules/sync/application/use-cases/list-sync-runs.use-case";
import { RequestManualSyncUseCase } from "@/modules/sync/application/use-cases/request-manual-sync.use-case";
import { RunDailySyncUseCase } from "@/modules/sync/application/use-cases/run-daily-sync.use-case";
import { IntegrationStateOrmEntity } from "@/modules/sync/infrastructure/persistence/typeorm/entities/integration-state.orm-entity";
import { SyncRunItemOrmEntity } from "@/modules/sync/infrastructure/persistence/typeorm/entities/sync-run-item.orm-entity";
import { SyncRunOrmEntity } from "@/modules/sync/infrastructure/persistence/typeorm/entities/sync-run.orm-entity";
import { IntegrationStateTypeormRepository } from "@/modules/sync/infrastructure/persistence/typeorm/repositories/integration-state-typeorm.repository";
import { SyncRunTypeormRepository } from "@/modules/sync/infrastructure/persistence/typeorm/repositories/sync-run-typeorm.repository";
import { InternalSyncController } from "@/modules/sync/presentation/rest/internal-sync.controller";
import { SyncController } from "@/modules/sync/presentation/rest/sync.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SyncRunOrmEntity,
      SyncRunItemOrmEntity,
      IntegrationStateOrmEntity,
    ]),
    InstagramModule,
    FollowersModule,
    NotificationsModule,
    UsersModule,
  ],
  controllers: [SyncController, InternalSyncController],
  providers: [
    {
      provide: SYNC_SETTINGS,
      useFactory: syncSettingsFactory,
      inject: [ConfigService],
    },
    { provide: SYNC_RUN_REPOSITORY, useClass: SyncRunTypeormRepository },
    {
      provide: INTEGRATION_STATE_REPOSITORY,
      useClass: IntegrationStateTypeormRepository,
    },
    OwnerResolverService,
    IntegrationGuardService,
    SyncEngineService,
    SyncCoordinatorService,
    GetSyncStatusUseCase,
    ListSyncRunsUseCase,
    RequestManualSyncUseCase,
    RunDailySyncUseCase,
    CronSecretGuard,
  ],
})
export class SyncModule {}
