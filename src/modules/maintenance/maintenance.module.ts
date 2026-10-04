import { Module } from "@nestjs/common";
import { CronSecretGuard } from "@/common/security/cron-secret.guard";
import { AccountModule } from "@/modules/account/account.module";
import { BillingModule } from "@/modules/billing/billing.module";
import { InternalMaintenanceController } from "@/modules/maintenance/internal-maintenance.controller";

@Module({
  imports: [AccountModule, BillingModule],
  controllers: [InternalMaintenanceController],
  providers: [CronSecretGuard],
})
export class MaintenanceModule {}
