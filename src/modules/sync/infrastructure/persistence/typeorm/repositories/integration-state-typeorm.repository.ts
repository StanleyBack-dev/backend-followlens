import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import type { IntegrationStateRepositoryPort } from "@/modules/sync/application/ports/integration-state-repository.port";
import {
  HEALTHY_INTEGRATION,
  type IntegrationState,
} from "@/modules/sync/domain/policies/integration-circuit-breaker";
import { IntegrationStateOrmEntity } from "@/modules/sync/infrastructure/persistence/typeorm/entities/integration-state.orm-entity";

const INSTAGRAM_ROW_ID = "instagram";

@Injectable()
export class IntegrationStateTypeormRepository implements IntegrationStateRepositoryPort {
  constructor(
    @InjectRepository(IntegrationStateOrmEntity)
    private readonly repository: Repository<IntegrationStateOrmEntity>,
  ) {}

  async get(): Promise<IntegrationState> {
    const row = await this.repository.findOneBy({ id: INSTAGRAM_ROW_ID });
    if (!row) return HEALTHY_INTEGRATION;
    return {
      blocked: row.blocked,
      reason: row.reason,
      blockedAt: row.blockedAt,
      sessionFingerprint: row.sessionFingerprint,
    };
  }

  async save(state: IntegrationState): Promise<void> {
    await this.repository.upsert(
      {
        id: INSTAGRAM_ROW_ID,
        blocked: state.blocked,
        reason: state.reason?.slice(0, 255) ?? null,
        blockedAt: state.blockedAt,
        sessionFingerprint: state.sessionFingerprint,
      },
      ["id"],
    );
  }
}
