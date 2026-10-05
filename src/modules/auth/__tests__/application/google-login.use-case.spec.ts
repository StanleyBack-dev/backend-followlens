import type { TokenServicePort } from "@/modules/auth/application/ports/token-service.port";
import { GoogleLoginUseCase } from "@/modules/auth/application/use-cases/google-login.use-case";
import type { GoogleTokenVerifier } from "@/modules/auth/application/use-cases/google-token-verifier";
import type { SendWelcomeEmailUseCase } from "@/modules/mails/application/use-cases/send-welcome-email.use-case";
import type { UserRepositoryPort } from "@/modules/users/application/ports/user-repository.port";
import { UserPlan } from "@/modules/users/domain/enums/user-plan.enum";
import { UserRole } from "@/modules/users/domain/enums/user-role.enum";
import type { ClockPort } from "@/shared/application/ports/clock.port";

function setup(options: { created: boolean; mailFails?: boolean }) {
  const verifier = {
    verify: jest.fn(async () => ({
      googleId: "g-1",
      email: "ana@test.com",
      name: "Ana Souza",
      pictureUrl: null,
    })),
  } as unknown as GoogleTokenVerifier;

  const users = {
    upsertFromGoogle: jest.fn(async (input) => ({
      created: options.created,
      user: {
        id: "user-1",
        googleId: input.googleId,
        email: input.email,
        name: input.name,
        pictureUrl: input.pictureUrl,
        plan: UserPlan.FREE,
        role: UserRole.USER,
        termsVersion: null,
        termsAcceptedAt: null,
      },
    })),
  } as unknown as UserRepositoryPort;

  const tokens = {
    issue: jest.fn(() => ({
      token: "jwt",
      expiresAt: new Date("2026-10-10"),
    })),
  } as unknown as TokenServicePort;

  const clock = { now: () => new Date("2026-10-03T12:00:00Z") } as ClockPort;

  const welcome = {
    execute: jest.fn(async () => {
      if (options.mailFails) throw new Error("brevo down");
    }),
  } as unknown as SendWelcomeEmailUseCase;

  const useCase = new GoogleLoginUseCase(
    verifier,
    tokens,
    users,
    clock,
    { forcedRoleFor: () => undefined } as never,
    welcome,
    { attribute: jest.fn(async () => undefined) } as never,
  );
  return { useCase, verifier, tokens, welcome };
}

describe("GoogleLoginUseCase", () => {
  it("verifies the token, upserts the user and issues a session", async () => {
    const { useCase, verifier, tokens } = setup({ created: false });

    const result = await useCase.execute("google-id-token");

    expect(verifier.verify).toHaveBeenCalledWith("google-id-token");
    expect(result.user.id).toBe("user-1");
    expect(result.token.token).toBe("jwt");
    expect(tokens.issue).toHaveBeenCalledWith({
      sub: "user-1",
      email: "ana@test.com",
    });
  });

  it("sends the welcome email only when the account was just created", async () => {
    const returning = setup({ created: false });
    await returning.useCase.execute("t");
    expect(returning.welcome.execute).not.toHaveBeenCalled();

    const fresh = setup({ created: true });
    await fresh.useCase.execute("t");
    expect(fresh.welcome.execute).toHaveBeenCalledWith({
      to: "ana@test.com",
      name: "Ana Souza",
    });
  });

  it("still signs the user in when the welcome email fails", async () => {
    const { useCase } = setup({ created: true, mailFails: true });

    const result = await useCase.execute("t");

    expect(result.token.token).toBe("jwt");
  });
});
