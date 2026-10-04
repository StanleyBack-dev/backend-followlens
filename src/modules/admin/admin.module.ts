import { Module } from "@nestjs/common";
import { AdminGuard } from "@/common/security/admin.guard";
import { GetAdminDashboardUseCase } from "@/modules/admin/application/get-admin-dashboard.use-case";
import { GetAdminOverviewUseCase } from "@/modules/admin/application/get-admin-overview.use-case";
import { ListUsersUseCase } from "@/modules/admin/application/list-users.use-case";
import { UpdateUserAccessUseCase } from "@/modules/admin/application/update-user-access.use-case";
import { AdminController } from "@/modules/admin/presentation/rest/admin.controller";
import { BillingModule } from "@/modules/billing/billing.module";
import { SupportModule } from "@/modules/support/support.module";
import { UsersModule } from "@/modules/users/users.module";

@Module({
  imports: [UsersModule, BillingModule, SupportModule],
  controllers: [AdminController],
  providers: [
    AdminGuard,
    ListUsersUseCase,
    GetAdminOverviewUseCase,
    GetAdminDashboardUseCase,
    UpdateUserAccessUseCase,
  ],
})
export class AdminModule {}
