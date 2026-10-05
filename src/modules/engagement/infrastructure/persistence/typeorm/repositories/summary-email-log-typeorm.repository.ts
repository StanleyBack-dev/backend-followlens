import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import type { SummaryEmailLogPort } from "@/modules/engagement/application/ports/summary-email-log.port";
import { MonthlySummaryEmailOrmEntity } from "@/modules/engagement/infrastructure/persistence/typeorm/entities/monthly-summary-email.orm-entity";

@Injectable()
export class SummaryEmailLogTypeormRepository implements SummaryEmailLogPort {
  constructor(
    @InjectRepository(MonthlySummaryEmailOrmEntity)
    private readonly repository: Repository<MonthlySummaryEmailOrmEntity>,
  ) {}

  async claim(profileId: string, month: string): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .insert()
      .into(MonthlySummaryEmailOrmEntity)
      .values({ profileId, month })
      .orIgnore()
      .returning("month")
      .execute();
    return (result.raw as unknown[]).length > 0;
  }

  async release(profileId: string, month: string): Promise<void> {
    await this.repository.delete({ profileId, month });
  }
}
