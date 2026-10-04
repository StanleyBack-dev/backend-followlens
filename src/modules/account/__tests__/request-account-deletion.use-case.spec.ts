import { AppException } from "@/common/exceptions/app-exception";
import type { GetAccountProfileUseCase } from "@/modules/account/application/use-cases/get-account-profile.use-case";
import { RequestAccountDeletionUseCase } from "@/modules/account/application/use-cases/request-account-deletion.use-case";
import type { SendAccountDeletionEmailUseCase } from "@/modules/mails/application/use-cases/send-account-deletion-email.use-case";
import type { UserRepositoryPort } from "@/modules/users/application/ports/user-repository.port";
import type { ClockPort } from "@/shared/application/ports/clock.port";

const NOW = new Date("2026-10-03T12:00:00.000Z");
const EMAIL = "ana@test.com";

function setup(options: { scheduledFor?: Date; mailFails?: boolean } = {}) {
  const users = {
    findById: jest.fn(async (id: string) => ({
      id,
      email: EMAIL,
      name: "Ana Souza",
      deletionScheduledFor: options.scheduledFor ?? null,
    })),
    scheduleDeletion: jest.fn(async () => undefined),
  } as unknown as UserRepositoryPort;
  const clock = { now: () => NOW } as unknown as ClockPort;
  const getProfile = {
    execute: jest.fn(async (id: string) => ({ id })),
  } as unknown as GetAccountProfileUseCase;
  const mail = {
    execute: jest.fn(async () => {
      if (options.mailFails) throw new Error("brevo down");
    }),
  } as unknown as SendAccountDeletionEmailUseCase;

  const useCase = new RequestAccountDeletionUseCase(
    users,
    { deletionGraceDays: 7 },
    clock,
    getProfile,
    mail,
  );
  return { useCase, users, mail };
}

describe("RequestAccountDeletionUseCase", () => {
  it("schedules the deletion after the grace period and notifies by e-mail", async () => {
    const { useCase, users, mail } = setup();

    const result = await useCase.execute("u-1", {
      confirmEmail: " ANA@test.com ",
    });

    const scheduledFor = new Date("2026-10-10T12:00:00.000Z");
    expect(users.scheduleDeletion).toHaveBeenCalledWith(
      "u-1",
      NOW,
      scheduledFor,
    );
    expect(mail.execute).toHaveBeenCalledWith({
      to: EMAIL,
      name: "Ana Souza",
      graceDays: 7,
      scheduledFor,
    });
    expect(result.emailSent).toBe(true);
  });

  it("rejects a confirmation that is not the account e-mail", async () => {
    const { useCase, users, mail } = setup();

    await expect(
      useCase.execute("u-1", { confirmEmail: "outra@test.com" }),
    ).rejects.toBeInstanceOf(AppException);
    expect(users.scheduleDeletion).not.toHaveBeenCalled();
    expect(mail.execute).not.toHaveBeenCalled();
  });

  it("keeps the original date when the deletion is already scheduled", async () => {
    const { useCase, users, mail } = setup({
      scheduledFor: new Date("2026-10-05T12:00:00.000Z"),
    });

    const result = await useCase.execute("u-1", { confirmEmail: EMAIL });

    expect(users.scheduleDeletion).not.toHaveBeenCalled();
    expect(mail.execute).not.toHaveBeenCalled();
    expect(result.emailSent).toBe(false);
  });

  it("still schedules the deletion when the e-mail fails", async () => {
    const { useCase, users } = setup({ mailFails: true });

    const result = await useCase.execute("u-1", { confirmEmail: EMAIL });

    expect(users.scheduleDeletion).toHaveBeenCalled();
    expect(result.emailSent).toBe(false);
  });
});
