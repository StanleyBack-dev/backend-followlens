import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, type Repository } from "typeorm";
import type {
  RecordRewardInput,
  ReferralRewardRepositoryPort,
  ReferralRewardView,
} from "@/modules/referrals/application/ports/referral-reward-repository.port";
import { ReferralRewardOrmEntity } from "@/modules/referrals/infrastructure/persistence/typeorm/entities/referral-reward.orm-entity";

@Injectable()
export class ReferralRewardTypeormRepository implements ReferralRewardRepositoryPort {
  constructor(
    @InjectRepository(ReferralRewardOrmEntity)
    private readonly repository: Repository<ReferralRewardOrmEntity>,
  ) {}

  async record(input: RecordRewardInput): Promise<ReferralRewardView> {
    return toView(
      await this.repository.save(
        this.repository.create({ ...input, revokedAt: null }),
      ),
    );
  }

  async listByReferrer(referrerId: string): Promise<ReferralRewardView[]> {
    const rows = await this.repository.find({
      where: { referrerId },
      order: { createdAt: "DESC" },
    });
    return rows.map(toView);
  }

  async findActiveByReferred(
    referredUserId: string,
  ): Promise<ReferralRewardView | null> {
    const row = await this.repository.findOneBy({
      referredUserId,
      revokedAt: IsNull(),
    });
    return row ? toView(row) : null;
  }

  async markRevoked(rewardId: string, at: Date): Promise<void> {
    await this.repository.update({ id: rewardId }, { revokedAt: at });
  }
}

function toView(row: ReferralRewardOrmEntity): ReferralRewardView {
  return {
    id: row.id,
    referrerId: row.referrerId,
    referredUserId: row.referredUserId,
    days: row.days,
    appliedAs: row.appliedAs,
    revokedAt: row.revokedAt ?? null,
    createdAt: row.createdAt,
  };
}
