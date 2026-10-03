import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type {
  AuthenticatedRequest,
  RequestUser,
} from "@/modules/auth/presentation/guards/user-session.guard";

// Injects the authenticated user (set by UserSessionGuard). On @Public routes
// there is none, so handlers that use it are always behind the guard.
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user as RequestUser;
  },
);
