import { Inject, Injectable, Logger } from "@nestjs/common";
import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";
import type { AccountProfile } from "@/modules/account/application/account-profile";
import {
  ACCOUNT_SETTINGS,
  type AccountSettings,
} from "@/modules/account/application/account.config";
import { GetAccountProfileUseCase } from "@/modules/account/application/use-cases/get-account-profile.use-case";
import { SendAccountDeletionEmailUseCase } from "@/modules/mails/application/use-cases/send-account-deletion-email.use-case";
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from "@/modules/users/application/ports/user-repository.port";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

const DAY_MS = 86_400_000;

export type RequestAccountDeletionCommand = {
  /** The user retypes their e-mail to confirm. */
  confirmEmail: string;
};

export type RequestAccountDeletionResult = {
  profile: AccountProfile;
  emailSent: boolean;
};

// Schedules the deletion instead of removing right away: the user gets a
// notice by e-mail and can cancel during the grace period. The purge job
// removes the account once the scheduled date passes.
@Injectable()
export class RequestAccountDeletionUseCase {
  private readonly logger = new Logger(RequestAccountDeletionUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(ACCOUNT_SETTINGS) private readonly settings: AccountSettings,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly getProfile: GetAccountProfileUseCase,
    private readonly deletionEmail: SendAccountDeletionEmailUseCase,
  ) {}

  async execute(
    userId: string,
    command: RequestAccountDeletionCommand,
  ): Promise<RequestAccountDeletionResult> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw AppException.from(APP_ERRORS.auth.userNotFound, undefined);
    }
    if (
      command.confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()
    ) {
      throw AppException.from(
        APP_ERRORS.account.deletionConfirmationMismatch,
        undefined,
      );
    }

    // Already scheduled: keep the original date and don't e-mail again.
    if (user.deletionScheduledFor) {
      return {
        profile: await this.getProfile.execute(userId),
        emailSent: false,
      };
    }

    const now = this.clock.now();
    const scheduledFor = new Date(
      now.getTime() + this.settings.deletionGraceDays * DAY_MS,
    );
    await this.users.scheduleDeletion(userId, now, scheduledFor);

    return {
      profile: await this.getProfile.execute(userId),
      emailSent: await this.notify(user.email, user.name, scheduledFor),
    };
  }

  // Best-effort: a mail outage must not block the request the user just made.
  private async notify(
    to: string,
    name: string,
    scheduledFor: Date,
  ): Promise<boolean> {
    try {
      await this.deletionEmail.execute({
        to,
        name,
        graceDays: this.settings.deletionGraceDays,
        scheduledFor,
      });
      return true;
    } catch (error) {
      this.logger.warn(
        `Falha ao enviar e-mail de exclusão de conta para ${to}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }
}
