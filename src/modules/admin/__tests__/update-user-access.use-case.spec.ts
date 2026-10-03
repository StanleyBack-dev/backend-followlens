import { AppException } from "@/common/exceptions/app-exception";
import { UpdateUserAccessUseCase } from "@/modules/admin/application/update-user-access.use-case";
import type { AdminPolicyService } from "@/modules/users/application/admin-policy.service";
import type { UserRepositoryPort } from "@/modules/users/application/ports/user-repository.port";
import { UserPlan } from "@/modules/users/domain/enums/user-plan.enum";
import { UserRole } from "@/modules/users/domain/enums/user-role.enum";

const MASTER = "master@test.com";

function setup(targetEmail: string | null) {
  const users = {
    findById: jest.fn(async (id: string) =>
      targetEmail ? { id, email: targetEmail } : null,
    ),
    updateAccess: jest.fn(async (id: string, changes) => ({
      id,
      email: targetEmail,
      name: "Alvo",
      pictureUrl: null,
      plan: changes.plan ?? UserPlan.FREE,
      role: changes.role ?? UserRole.USER,
      termsAccepted: true,
      lastLoginAt: null,
      createdAt: new Date(),
    })),
  } as unknown as UserRepositoryPort;
  const policy = {
    isMaster: (email: string) => email === MASTER,
  } as unknown as AdminPolicyService;
  return { users, useCase: new UpdateUserAccessUseCase(users, policy) };
}

describe("UpdateUserAccessUseCase", () => {
  it("promotes a regular user to admin", async () => {
    const { useCase } = setup("ana@test.com");

    const result = await useCase.execute("u-1", { role: UserRole.ADMIN });

    expect(result.role).toBe(UserRole.ADMIN);
    expect(result.isMaster).toBe(false);
  });

  it("refuses to change the master's role", async () => {
    const { useCase, users } = setup(MASTER);

    await expect(
      useCase.execute("u-1", { role: UserRole.USER }),
    ).rejects.toBeInstanceOf(AppException);
    expect(users.updateAccess).not.toHaveBeenCalled();
  });

  it("still allows changing the master's plan", async () => {
    const { useCase } = setup(MASTER);

    const result = await useCase.execute("u-1", { plan: UserPlan.PRO });

    expect(result.plan).toBe(UserPlan.PRO);
  });

  it("returns not found for an unknown user", async () => {
    const { useCase } = setup(null);

    await expect(
      useCase.execute("u-404", { plan: UserPlan.PRO }),
    ).rejects.toBeInstanceOf(AppException);
  });
});
