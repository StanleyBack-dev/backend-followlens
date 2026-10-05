import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
} from "@nestjs/common";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { Public } from "@/common/decorators/public.decorator";
import { GoogleLoginUseCase } from "@/modules/auth/application/use-cases/google-login.use-case";
import type { RequestUser } from "@/modules/auth/presentation/guards/user-session.guard";
import {
  GoogleLoginDto,
  type GoogleLoginResponse,
  type SessionUserResponse,
} from "@/modules/auth/presentation/rest/dtos/google-login.dto";
import { CURRENT_LEGAL_VERSION } from "@/modules/legal/domain/legal-version.constant";
import { AdminPolicyService } from "@/modules/users/application/admin-policy.service";
import {
  hasProAccess,
  isBonusActive,
} from "@/modules/users/domain/plan-access";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from "@/modules/users/application/ports/user-repository.port";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly googleLogin: GoogleLoginUseCase,
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    private readonly adminPolicy: AdminPolicyService,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  @Public()
  @Post("google")
  @HttpCode(HttpStatus.OK)
  async google(@Body() body: GoogleLoginDto): Promise<GoogleLoginResponse> {
    const { token, user } = await this.googleLogin.execute(
      body.idToken,
      body.referralCode,
    );
    const isAdmin = user.role === "admin";
    return {
      accessToken: token.token,
      expiresAt: token.expiresAt.toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        pictureUrl: user.pictureUrl,
        plan: user.plan,
        role: user.role,
        isAdmin,
        isMaster: this.adminPolicy.isMaster(user.email),
        isPro: hasProAccess({
          plan: user.plan,
          isAdmin,
          proBonusActive: isBonusActive(user.proBonusUntil, this.clock.now()),
        }),
        termsAccepted: user.termsVersion === CURRENT_LEGAL_VERSION,
        legalVersion: CURRENT_LEGAL_VERSION,
        deletionScheduledFor: user.deletionScheduledFor?.toISOString() ?? null,
      },
    };
  }

  @Get("me")
  async me(@CurrentUser() current: RequestUser): Promise<SessionUserResponse> {
    const user = await this.users.findById(current.id);
    return {
      id: current.id,
      email: current.email,
      name: user?.name ?? "",
      pictureUrl: user?.pictureUrl ?? null,
      plan: current.plan,
      role: current.role,
      isAdmin: current.isAdmin,
      isMaster: current.isMaster,
      isPro: hasProAccess(current),
      termsAccepted: user?.termsVersion === CURRENT_LEGAL_VERSION,
      legalVersion: CURRENT_LEGAL_VERSION,
      deletionScheduledFor: user?.deletionScheduledFor?.toISOString() ?? null,
    };
  }
}
