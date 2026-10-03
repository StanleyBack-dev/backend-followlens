import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { TOKEN_SERVICE } from "@/modules/auth/application/ports/token-service.port";
import { GoogleLoginUseCase } from "@/modules/auth/application/use-cases/google-login.use-case";
import { GoogleTokenVerifier } from "@/modules/auth/application/use-cases/google-token-verifier";
import { JwtTokenService } from "@/modules/auth/infrastructure/crypto/jwt-token-service";
import { UserSessionGuard } from "@/modules/auth/presentation/guards/user-session.guard";
import { AuthController } from "@/modules/auth/presentation/rest/auth.controller";
import { MailModule } from "@/modules/mails/mail.module";
import { UsersModule } from "@/modules/users/users.module";

@Module({
  imports: [UsersModule, MailModule],
  controllers: [AuthController],
  providers: [
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
    GoogleTokenVerifier,
    GoogleLoginUseCase,
    { provide: APP_GUARD, useClass: UserSessionGuard },
  ],
  exports: [TOKEN_SERVICE],
})
export class AuthModule {}
