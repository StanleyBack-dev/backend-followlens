import { Inject, Injectable } from "@nestjs/common";
import {
  FOLLOWER_REPOSITORY,
  type FollowerRepositoryPort,
} from "@/modules/followers/application/ports/follower-repository.port";
import { FollowerEventType } from "@/modules/followers/domain/enums/follower-event-type.enum";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

export type FollowersOverview = {
  activeFollowers: number;
  lostFollowersTotal: number;
  lostLast7Days: number;
  lostLast30Days: number;
  gainedLast30Days: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class GetFollowersOverviewUseCase {
  constructor(
    @Inject(FOLLOWER_REPOSITORY)
    private readonly followers: FollowerRepositoryPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(userId: string): Promise<FollowersOverview> {
    const now = this.clock.now().getTime();
    const since7 = new Date(now - 7 * DAY_MS);
    const since30 = new Date(now - 30 * DAY_MS);

    const [counts, lost7, lost30, gained30, returned30] = await Promise.all([
      this.followers.countByStatus(userId),
      this.followers.countEventsSince(userId, FollowerEventType.LOST, since7),
      this.followers.countEventsSince(userId, FollowerEventType.LOST, since30),
      this.followers.countEventsSince(
        userId,
        FollowerEventType.GAINED,
        since30,
      ),
      this.followers.countEventsSince(
        userId,
        FollowerEventType.RETURNED,
        since30,
      ),
    ]);

    return {
      activeFollowers: counts.active,
      lostFollowersTotal: counts.lost,
      lostLast7Days: lost7,
      lostLast30Days: lost30,
      gainedLast30Days: gained30 + returned30,
    };
  }
}
