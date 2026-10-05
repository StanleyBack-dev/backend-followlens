import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  SUMMARY_EMAIL_LOG,
  type SummaryEmailLogPort,
} from "@/modules/engagement/application/ports/summary-email-log.port";
import { GetMonthlySummaryUseCase } from "@/modules/engagement/application/use-cases/get-monthly-summary.use-case";
import {
  addMonths,
  firstDayOf,
  monthOf,
} from "@/modules/engagement/domain/month";
import {
  IMPORT_REPOSITORY,
  type ImportRepositoryPort,
} from "@/modules/imports/application/ports/import-repository.port";
import { SendMonthlySummaryEmailUseCase } from "@/modules/mails/application/use-cases/send-monthly-summary-email.use-case";
import {
  PROFILE_REPOSITORY,
  type ProfileRepositoryPort,
} from "@/modules/profiles/application/ports/profile-repository.port";
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from "@/modules/users/application/ports/user-repository.port";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

// The summary goes out in the first days of the month; later runs only pick
// up what an earlier run missed.
const SEND_WINDOW_DAYS = 3;

export type MonthlySummariesOutcome = { month: string | null; sent: number };

// Daily job: e-mails last month's summary to every profile that imported
// during it. Safe to run repeatedly — each (profile, month) is sent once.
@Injectable()
export class SendMonthlySummariesUseCase {
  private readonly logger = new Logger(SendMonthlySummariesUseCase.name);

  constructor(
    @Inject(IMPORT_REPOSITORY) private readonly imports: ImportRepositoryPort,
    @Inject(PROFILE_REPOSITORY)
    private readonly profiles: ProfileRepositoryPort,
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(SUMMARY_EMAIL_LOG) private readonly log: SummaryEmailLogPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly getSummary: GetMonthlySummaryUseCase,
    private readonly email: SendMonthlySummaryEmailUseCase,
  ) {}

  async execute(): Promise<MonthlySummariesOutcome> {
    const today = this.clock.localDate();
    if (Number(today.slice(8, 10)) > SEND_WINDOW_DAYS) {
      return { month: null, sent: 0 };
    }

    const month = addMonths(monthOf(today), -1);
    const profileIds = await this.imports.listProfilesWithImportsBetween(
      this.clock.startOfLocalDate(firstDayOf(month)),
      this.clock.startOfLocalDate(firstDayOf(monthOf(today))),
    );

    let sent = 0;
    for (const profileId of profileIds) {
      if (await this.sendTo(profileId, month)) sent += 1;
    }
    if (sent > 0) {
      this.logger.log(`${sent} resumo(s) de ${month} enviado(s).`);
    }
    return { month, sent };
  }

  private async sendTo(profileId: string, month: string): Promise<boolean> {
    if (!(await this.log.claim(profileId, month))) return false;
    try {
      const profile = await this.profiles.findById(profileId);
      const user = profile ? await this.users.findById(profile.userId) : null;
      // An account on its way out gets no more retention e-mail.
      if (!profile || !user || user.deletionScheduledFor) return false;

      await this.email.execute({
        to: user.email,
        name: user.name,
        profileName: profile.name,
        summary: await this.getSummary.execute(profileId, month),
      });
      return true;
    } catch (error) {
      // Free the claim so the next daily run tries this one again.
      await this.log.release(profileId, month);
      this.logger.warn(
        `Falha ao enviar o resumo de ${month} do perfil ${profileId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }
}
