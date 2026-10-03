import { Module } from "@nestjs/common";
import { FollowersModule } from "@/modules/followers/followers.module";
import { MailModule } from "@/modules/mails/mail.module";
import { NotifyPendingUnfollowsUseCase } from "@/modules/notifications/notify-pending-unfollows.use-case";

// Bridges the followers context (unfollow events) and the mails context so the
// ingestion modules don't each wire their own notifier.
@Module({
  imports: [FollowersModule, MailModule],
  providers: [NotifyPendingUnfollowsUseCase],
  exports: [NotifyPendingUnfollowsUseCase],
})
export class NotificationsModule {}
