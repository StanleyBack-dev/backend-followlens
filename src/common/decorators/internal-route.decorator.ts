import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common";
import { CronSecretGuard } from "@/common/security/cron-secret.guard";

// Routes called by schedulers (Vercel Cron). They skip both the BFF key and
// the owner session: CRON_SECRET is the credential here.
export const IS_INTERNAL_ROUTE_KEY = "isInternalRoute";

export const InternalRoute = () =>
  applyDecorators(
    SetMetadata(IS_INTERNAL_ROUTE_KEY, true),
    UseGuards(CronSecretGuard),
  );
