import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import type {
  CompletedImport,
  ImportRepositoryPort,
  ImportView,
  RecordImportInput,
} from "@/modules/imports/application/ports/import-repository.port";
import { ImportStatus } from "@/modules/imports/domain/enums/import-status.enum";
import { ImportOrmEntity } from "@/modules/imports/infrastructure/persistence/typeorm/entities/import.orm-entity";
import {
  paginate,
  type PageRequest,
  type Paginated,
} from "@/shared/application/pagination";

@Injectable()
export class ImportTypeormRepository implements ImportRepositoryPort {
  constructor(
    @InjectRepository(ImportOrmEntity)
    private readonly repository: Repository<ImportOrmEntity>,
  ) {}

  async record(input: RecordImportInput): Promise<ImportView> {
    const saved = await this.repository.save(this.repository.create(input));
    return toView(saved);
  }

  countCompletedOn(profileId: string, localDate: string): Promise<number> {
    return this.repository.countBy({
      profileId,
      localDate,
      status: ImportStatus.COMPLETED,
    });
  }

  async findLatestCompleted(profileId: string): Promise<ImportView | null> {
    const row = await this.repository.findOne({
      where: { profileId, status: ImportStatus.COMPLETED },
      order: { createdAt: "DESC" },
    });
    return row ? toView(row) : null;
  }

  async findLastComparisonAt(profileId: string): Promise<Date | null> {
    const row = await this.repository.findOne({
      where: { profileId, status: ImportStatus.COMPLETED, baseline: false },
      order: { createdAt: "DESC" },
    });
    return row?.createdAt ?? null;
  }

  async listCompleted(profileId: string): Promise<CompletedImport[]> {
    const rows = await this.repository.find({
      where: { profileId, status: ImportStatus.COMPLETED },
      order: { createdAt: "ASC" },
      select: { createdAt: true, localDate: true, followersCount: true },
    });
    return rows.map((row) => ({
      createdAt: row.createdAt,
      localDate: row.localDate,
      followersCount: row.followersCount,
    }));
  }

  async listProfilesWithImportsBetween(
    from: Date,
    to: Date,
  ): Promise<string[]> {
    const rows = await this.repository
      .createQueryBuilder("i")
      .select("DISTINCT i.idtb_profiles", "profileId")
      .where("i.status = :status", { status: ImportStatus.COMPLETED })
      .andWhere("i.created_at >= :from AND i.created_at < :to", { from, to })
      .getRawMany<{ profileId: string }>();
    return rows.map((row) => row.profileId);
  }

  async list(
    profileId: string,
    request: PageRequest,
  ): Promise<Paginated<ImportView>> {
    const [rows, total] = await this.repository.findAndCount({
      where: { profileId },
      order: { createdAt: "DESC" },
      skip: (request.page - 1) * request.limit,
      take: request.limit,
    });
    return paginate(rows.map(toView), total, request);
  }
}

function toView(row: ImportOrmEntity): ImportView {
  return {
    id: row.id,
    status: row.status,
    filename: row.filename,
    followersCount: row.followersCount,
    baseline: row.baseline,
    lostCount: row.lostCount,
    gainedCount: row.gainedCount,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt,
  };
}
