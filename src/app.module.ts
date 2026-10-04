import { Module, ValidationPipe } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_PIPE } from "@nestjs/core";
import { AppController } from "@/app.controller";
import { HttpExceptionFilter } from "@/common/filters/http-exception.filter";
import { InternalApiKeyGuard } from "@/common/security/internal-api-key.guard";
import { AppConfigModule } from "@/config/config.module";
import { DatabaseModule } from "@/database/database.module";
import { AccountModule } from "@/modules/account/account.module";
import { AdminModule } from "@/modules/admin/admin.module";
import { BillingModule } from "@/modules/billing/billing.module";
import { AuthModule } from "@/modules/auth/auth.module";
import { FollowersModule } from "@/modules/followers/followers.module";
import { ImportsModule } from "@/modules/imports/imports.module";
import { LegalModule } from "@/modules/legal/legal.module";
import { MaintenanceModule } from "@/modules/maintenance/maintenance.module";
import { ProfilesModule } from "@/modules/profiles/profiles.module";
import { SupportModule } from "@/modules/support/support.module";
import { SyncModule } from "@/modules/sync/sync.module";
import { UsersModule } from "@/modules/users/users.module";
import { SharedModule } from "@/shared/shared.module";

@Module({
  controllers: [AppController],
  imports: [
    AppConfigModule,
    DatabaseModule,
    SharedModule,
    UsersModule,
    AuthModule,
    AccountModule,
    AdminModule,
    BillingModule,
    MaintenanceModule,
    LegalModule,
    ProfilesModule,
    SupportModule,
    FollowersModule,
    ImportsModule,
    SyncModule,
  ],
  providers: [
    // Order matters: the BFF key is checked before the user session
    // (UserSessionGuard is registered by AuthModule).
    { provide: APP_GUARD, useClass: InternalApiKeyGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
  ],
})
export class AppModule {}
