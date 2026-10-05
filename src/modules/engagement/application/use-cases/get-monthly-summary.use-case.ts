import { Inject, Injectable } from "@nestjs/common";
import {
  addMonths,
  firstDayOf,
  isMonth,
  monthOf,
} from "@/modules/engagement/domain/month";
import {
  FOLLOWER_REPOSITORY,
  type FollowerRepositoryPort,
} from "@/modules/followers/application/ports/follower-repository.port";
import { FollowerEventType } from "@/modules/followers/domain/enums/follower-event-type.enum";
import {
  IMPORT_REPOSITORY,
  type ImportRepositoryPort,
} from "@/modules/imports/application/ports/import-repository.port";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

export type MonthlySummary = {
  /** YYYY-MM */
  month: string;
  /** Whether this is the month still in progress. */
  current: boolean;
  imports: number;
  gained: number;
  returned: number;
  lost: number;
  /** gained + returned - lost */
  net: number;
  /** Follower count at the first and at the last import of the month. */
  followersAtStart: number | null;
  followersAtEnd: number | null;
  /** The month of the profile's first import: nothing exists before it. */
  firstMonth: string | null;
};

@Injectable()
export class GetMonthlySummaryUseCase {
  constructor(
    @Inject(IMPORT_REPOSITORY) private readonly imports: ImportRepositoryPort,
    @Inject(FOLLOWER_REPOSITORY)
    private readonly followers: FollowerRepositoryPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  /** `month` defaults to the current one; an invalid value falls back to it. */
  async execute(profileId: string, month?: string): Promise<MonthlySummary> {
    const thisMonth = monthOf(this.clock.localDate());
    const target =
      month && isMonth(month) && month <= thisMonth ? month : thisMonth;
    const from = this.clock.startOfLocalDate(firstDayOf(target));
    const to = this.clock.startOfLocalDate(firstDayOf(addMonths(target, 1)));

    const [imports, gained, returned, lost] = await Promise.all([
      this.imports.listCompleted(profileId),
      this.followers.countEventsBetween(
        profileId,
        FollowerEventType.GAINED,
        from,
        to,
      ),
      this.followers.countEventsBetween(
        profileId,
        FollowerEventType.RETURNED,
        from,
        to,
      ),
      this.followers.countEventsBetween(
        profileId,
        FollowerEventType.LOST,
        from,
        to,
      ),
    ]);
    const inMonth = imports.filter(
      (item) => item.createdAt >= from && item.createdAt < to,
    );
    // The last list seen before the month is where the month starts from.
    const before = imports.filter((item) => item.createdAt < from);
    const opening = before[before.length - 1] ?? inMonth[0];

    return {
      month: target,
      current: target === thisMonth,
      imports: inMonth.length,
      gained,
      returned,
      lost,
      net: gained + returned - lost,
      followersAtStart: opening?.followersCount ?? null,
      followersAtEnd: inMonth[inMonth.length - 1]?.followersCount ?? null,
      firstMonth: imports[0] ? monthOf(imports[0].localDate) : null,
    };
  }
}
