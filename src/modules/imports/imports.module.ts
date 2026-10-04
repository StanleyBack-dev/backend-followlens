import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FollowersModule } from "@/modules/followers/followers.module";
import { NotificationsModule } from "@/modules/notifications/notifications.module";
import { EXPORT_FILE_READER } from "@/modules/imports/application/ports/export-file-reader.port";
import { IMPORT_REPOSITORY } from "@/modules/imports/application/ports/import-repository.port";
import {
  IMPORT_SETTINGS,
  importSettingsFactory,
} from "@/modules/imports/application/imports.config";
import { GetImportStatusUseCase } from "@/modules/imports/application/use-cases/get-import-status.use-case";
import { ImportFollowersExportUseCase } from "@/modules/imports/application/use-cases/import-followers-export.use-case";
import { ListImportsUseCase } from "@/modules/imports/application/use-cases/list-imports.use-case";
import { ZipExportFileReader } from "@/modules/imports/infrastructure/file/zip-export-file.reader";
import { ImportOrmEntity } from "@/modules/imports/infrastructure/persistence/typeorm/entities/import.orm-entity";
import { ImportTypeormRepository } from "@/modules/imports/infrastructure/persistence/typeorm/repositories/import-typeorm.repository";
import { ProfilesModule } from "@/modules/profiles/profiles.module";
import { planLimitsProvider } from "@/shared/application/plan-limits.config";
import { ImportsController } from "@/modules/imports/presentation/rest/imports.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([ImportOrmEntity]),
    FollowersModule,
    NotificationsModule,
    ProfilesModule,
  ],
  controllers: [ImportsController],
  providers: [
    {
      provide: IMPORT_SETTINGS,
      useFactory: importSettingsFactory,
      inject: [ConfigService],
    },
    planLimitsProvider,
    { provide: IMPORT_REPOSITORY, useClass: ImportTypeormRepository },
    { provide: EXPORT_FILE_READER, useClass: ZipExportFileReader },
    ImportFollowersExportUseCase,
    GetImportStatusUseCase,
    ListImportsUseCase,
  ],
})
export class ImportsModule {}
