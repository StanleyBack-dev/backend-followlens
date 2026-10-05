import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThanOrEqual, type Repository } from "typeorm";
import type {
  ReferralClickRepositoryPort,
  ReferralClickStats,
} from "@/modules/referrals/application/ports/referral-reward-repository.port";
import { ReferralClickOrmEntity } from "@/modules/referrals/infrastructure/persistence/typeorm/entities/referral-click.orm-entity";

@Injectable()
export class ReferralClickTypeormRepository implements ReferralClickRepositoryPort {
  constructor(
    @InjectRepository(ReferralClickOrmEntity)
    private readonly repository: Repository<ReferralClickOrmEntity>,
  ) {}

  async record(referrerId: string, at: Date): Promise<void> {
    await this.repository.insert({ referrerId, clickedAt: at });
  }

  async stats(
    referrerId: string,
    since: Date,
    latestLimit: number,
  ): Promise<ReferralClickStats> {
    const [total, recent, latest] = await Promise.all([
      this.repository.countBy({ referrerId }),
      this.repository.countBy({
        referrerId,
        clickedAt: MoreThanOrEqual(since),
      }),
      this.repository.find({
        where: { referrerId },
        order: { clickedAt: "DESC" },
        take: latestLimit,
      }),
    ]);
    return { total, recent, latest: latest.map((row) => row.clickedAt) };
  }
}
