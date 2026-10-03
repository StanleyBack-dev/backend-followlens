import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from "@nestjs/common";
import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";
import type { AuthenticatedRequest } from "@/modules/auth/presentation/guards/user-session.guard";

// Allows only admins. Runs after UserSessionGuard, which populated request.user.
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (!user?.isAdmin) {
      throw AppException.from(APP_ERRORS.auth.adminOnly, undefined);
    }
    return true;
  }
}
