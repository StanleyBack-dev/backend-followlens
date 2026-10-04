import { Inject, Injectable } from "@nestjs/common";
import {
  FOLLOWER_REPOSITORY,
  type FollowerEventView,
  type FollowerRepositoryPort,
} from "@/modules/followers/application/ports/follower-repository.port";
import { FollowerEventType } from "@/modules/followers/domain/enums/follower-event-type.enum";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

// Outbox-style: unfollow events are persisted first and only marked as
// notified after the email goes out, so a failed send is retried later.
@Injectable()
export class UnfollowAlertsUseCase {
  constructor(
    @Inject(FOLLOWER_REPOSITORY)
    private readonly followers: FollowerRepositoryPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  pending(profileId: string): Promise<FollowerEventView[]> {
    return this.followers.findUnnotifiedEvents(
      profileId,
      FollowerEventType.LOST,
    );
  }

  async markSent(profileId: string, eventIds: string[]): Promise<void> {
    if (eventIds.length === 0) return;
    await this.followers.markEventsNotified(
      profileId,
      eventIds,
      this.clock.now(),
    );
  }
}
