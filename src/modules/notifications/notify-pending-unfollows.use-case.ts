import { Injectable, Logger } from "@nestjs/common";
import { UnfollowAlertsUseCase } from "@/modules/followers/application/use-cases/unfollow-alerts.use-case";
import { SendUnfollowAlertEmailUseCase } from "@/modules/mails/application/use-cases/send-unfollow-alert-email.use-case";

// Shared by both ingestion modes (file import and owner session sync). Sends
// a profile's unfollow alerts to its owner's email, then marks them.
@Injectable()
export class NotifyPendingUnfollowsUseCase {
  private readonly logger = new Logger(NotifyPendingUnfollowsUseCase.name);

  constructor(
    private readonly alerts: UnfollowAlertsUseCase,
    private readonly unfollowEmail: SendUnfollowAlertEmailUseCase,
  ) {}

  async execute(profileId: string, recipientEmail: string): Promise<number> {
    const pending = await this.alerts.pending(profileId);
    if (pending.length === 0) return 0;

    await this.unfollowEmail.execute(recipientEmail, {
      items: pending.map((event) => ({
        username: event.username,
        occurredAt: event.occurredAt,
      })),
    });
    await this.alerts.markSent(
      profileId,
      pending.map((event) => event.id),
    );
    return pending.length;
  }

  /**
   * Settles the pending alerts without e-mailing (plans without the alert).
   * Never throws; always reports 0 e-mails.
   */
  async dismissSafely(profileId: string): Promise<number> {
    try {
      const pending = await this.alerts.pending(profileId);
      await this.alerts.markSent(
        profileId,
        pending.map((event) => event.id),
      );
    } catch (error) {
      this.logger.error(
        `Falha ao dispensar alertas de unfollow: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }
    return 0;
  }

  /** Never throws — logs and returns 0 so the caller's main flow survives. */
  async executeSafely(
    profileId: string,
    recipientEmail: string,
  ): Promise<number> {
    try {
      return await this.execute(profileId, recipientEmail);
    } catch (error) {
      this.logger.error(
        `Falha ao enviar alerta de unfollow (fica pendente): ${error instanceof Error ? error.message : "unknown"}`,
      );
      return 0;
    }
  }
}
