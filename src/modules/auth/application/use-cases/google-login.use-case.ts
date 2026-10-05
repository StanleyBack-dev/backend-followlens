import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  type IssuedToken,
  TOKEN_SERVICE,
  type TokenServicePort,
} from "@/modules/auth/application/ports/token-service.port";
import { GoogleTokenVerifier } from "@/modules/auth/application/use-cases/google-token-verifier";
import { SendWelcomeEmailUseCase } from "@/modules/mails/application/use-cases/send-welcome-email.use-case";
import { ReferralsService } from "@/modules/referrals/application/referrals.service";
import { AdminPolicyService } from "@/modules/users/application/admin-policy.service";
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
  type UserView,
} from "@/modules/users/application/ports/user-repository.port";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

export type GoogleLoginResult = {
  token: IssuedToken;
  user: UserView;
};

@Injectable()
export class GoogleLoginUseCase {
  private readonly logger = new Logger(GoogleLoginUseCase.name);

  constructor(
    private readonly verifier: GoogleTokenVerifier,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenServicePort,
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly adminPolicy: AdminPolicyService,
    private readonly welcomeEmail: SendWelcomeEmailUseCase,
    private readonly referrals: ReferralsService,
  ) {}

  async execute(
    idToken: string,
    referralCode?: string,
  ): Promise<GoogleLoginResult> {
    const profile = await this.verifier.verify(idToken);
    const { user, created } = await this.users.upsertFromGoogle(
      {
        googleId: profile.googleId,
        email: profile.email,
        name: profile.name,
        pictureUrl: profile.pictureUrl,
        forcedRole: this.adminPolicy.forcedRoleFor(profile.email),
      },
      this.clock.now(),
    );
    if (created) {
      await this.referrals.attribute(user.id, referralCode);
      await this.sendWelcome(user);
    }

    const token = this.tokens.issue({ sub: user.id, email: user.email });
    return { token, user };
  }

  // Best-effort: a mail outage must never block the first sign-in.
  private async sendWelcome(user: UserView): Promise<void> {
    try {
      await this.welcomeEmail.execute({ to: user.email, name: user.name });
    } catch (error) {
      this.logger.warn(
        `Falha ao enviar e-mail de boas-vindas para ${user.email}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
