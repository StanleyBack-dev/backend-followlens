import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  FOLLOWER_REPOSITORY,
  type FollowerRepositoryPort,
  type NewFollowerEvent,
} from "@/modules/followers/application/ports/follower-repository.port";
import { FollowerEventType } from "@/modules/followers/domain/enums/follower-event-type.enum";
import { FollowerStatus } from "@/modules/followers/domain/enums/follower-status.enum";
import {
  SnapshotIntegrityPolicy,
  SnapshotRejectedError,
} from "@/modules/followers/domain/policies/snapshot-integrity.policy";
import { computeFollowerDiff } from "@/modules/followers/domain/services/follower-diff";
import type { FollowerSnapshotEntry } from "@/modules/followers/domain/types/follower.types";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

export type ApplyFollowerSnapshotCommand = {
  importId: string;
  entries: FollowerSnapshotEntry[];
};

export type ApplyFollowerSnapshotResult = {
  baseline: boolean;
  collected: number;
  lost: number;
  gained: number;
  returned: number;
};

@Injectable()
export class ApplyFollowerSnapshotUseCase {
  private readonly integrity: SnapshotIntegrityPolicy;

  constructor(
    @Inject(FOLLOWER_REPOSITORY)
    private readonly followers: FollowerRepositoryPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    config: ConfigService,
  ) {
    this.integrity = new SnapshotIntegrityPolicy({
      maxLossRatio: config.get<number>("IMPORT_MAX_LOSS_RATIO") ?? 0.3,
      lossRatioFloor: 5,
    });
  }

  /** @throws SnapshotRejectedError when the snapshot looks wrong. */
  async execute(
    userId: string,
    command: ApplyFollowerSnapshotCommand,
  ): Promise<ApplyFollowerSnapshotResult> {
    const known = await this.followers.findAllKnown(userId);
    const baseline = known.length === 0;
    const diff = computeFollowerDiff(known, command.entries);
    const activeCount = known.filter(
      (follower) => follower.status === FollowerStatus.ACTIVE,
    ).length;

    const verdict = this.integrity.assess({
      isBaseline: baseline,
      activeCount,
      lostCount: diff.lost.length,
    });
    if (!verdict.accepted) {
      throw new SnapshotRejectedError(verdict.reason);
    }

    const events: NewFollowerEvent[] = baseline
      ? []
      : [
          ...diff.lost.map((f) =>
            this.event(f.username, FollowerEventType.LOST, command.importId),
          ),
          ...diff.gained.map((e) =>
            this.event(e.username, FollowerEventType.GAINED, command.importId),
          ),
          ...diff.returned.map((e) =>
            this.event(
              e.username,
              FollowerEventType.RETURNED,
              command.importId,
            ),
          ),
        ];

    await this.followers.applyChangeSet(userId, {
      observedAt: this.clock.now(),
      current: diff.current,
      lostUsernames: diff.lost.map((f) => f.username),
      events,
    });

    return {
      baseline,
      collected: diff.current.length,
      lost: diff.lost.length,
      gained: baseline ? 0 : diff.gained.length,
      returned: diff.returned.length,
    };
  }

  private event(
    username: string,
    type: FollowerEventType,
    importId: string,
  ): NewFollowerEvent {
    return { username, type, importId };
  }
}
