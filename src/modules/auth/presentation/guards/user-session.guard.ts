import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { IS_INTERNAL_ROUTE_KEY } from "@/common/decorators/internal-route.decorator";
import { IS_PUBLIC_KEY } from "@/common/decorators/public.decorator";
import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";
import {
  TOKEN_SERVICE,
  type TokenServicePort,
} from "@/modules/auth/application/ports/token-service.port";
import { AdminPolicyService } from "@/modules/users/application/admin-policy.service";
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from "@/modules/users/application/ports/user-repository.port";
import type { UserRole } from "@/modules/users/domain/enums/user-role.enum";

export type RequestUser = {
  id: string;
  email: string;
  plan: string;
  role: UserRole;
  isAdmin: boolean;
  isMaster: boolean;
  termsAccepted: boolean;
};

export type AuthenticatedRequest = Request & { user?: RequestUser };

// Global guard: every route requires a valid session whose user still exists,
// unless @Public() or @InternalRoute(). Terms acceptance and roles are checked
// per route, not here.
@Injectable()
export class UserSessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenServicePort,
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    private readonly adminPolicy: AdminPolicyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets) ||
      this.reflector.getAllAndOverride<boolean>(IS_INTERNAL_ROUTE_KEY, targets)
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = (request.header("authorization") ?? "").split(" ");
    const payload = scheme === "Bearer" && token ? this.tokens.verify(token) : null;
    const user = payload ? await this.users.findById(payload.sub) : null;

    if (!user) {
      throw AppException.from(APP_ERRORS.auth.accessTokenMissing, undefined);
    }

    const isAdmin = user.role === "admin";
    request.user = {
      id: user.id,
      email: user.email,
      plan: user.plan,
      role: user.role,
      isAdmin,
      isMaster: this.adminPolicy.isMaster(user.email),
      termsAccepted: user.termsVersion !== null,
    };
    return true;
  }
}
