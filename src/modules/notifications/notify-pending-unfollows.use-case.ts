import { Injectable, Logger } from "@nestjs/common";
import { UnfollowAlertsUseCase } from "@/modules/followers/application/use-cases/unfollow-alerts.use-case";
import { SendUnfollowAlertEmailUseCase } from "@/modules/mails/application/use-cases/send-unfollow-alert-email.use-case";

// Shared by both ingestion modes (file import and owner session sync). Sends
// the user's own unfollow alerts to the user's own email, then marks them.
@Injectable()
export class NotifyPendingUnfollowsUseCase {
  private readonly logger = new Logger(NotifyPendingUnfollowsUseCase.name);

  constructor(
    private readonly alerts: UnfollowAlertsUseCase,
    private readonly unfollowEmail: SendUnfollowAlertEmailUseCase,
  ) {}

  async execute(userId: string, recipientEmail: string): Promise<number> {
    const pending = await this.alerts.pending(userId);
    if (pending.length === 0) return 0;

    await this.unfollowEmail.execute(recipientEmail, {
      items: pending.map((event) => ({
        username: event.username,
        occurredAt: event.occurredAt,
      })),
    });
    await this.alerts.markSent(
      userId,
      pending.map((event) => event.id),
    );
    return pending.length;
  }

  /** Never throws — logs and returns 0 so the caller's main flow survives. */
  async executeSafely(userId: string, recipientEmail: string): Promise<number> {
    try {
      return await this.execute(userId, recipientEmail);
    } catch (error) {
      this.logger.error(
        `Falha ao enviar alerta de unfollow (fica pendente): ${error instanceof Error ? error.message : "unknown"}`,
      );
      return 0;
    }
  }
}
