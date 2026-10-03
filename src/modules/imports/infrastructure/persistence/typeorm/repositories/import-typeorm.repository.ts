import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import type {
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

  countCompletedOn(userId: string, localDate: string): Promise<number> {
    return this.repository.countBy({
      userId,
      localDate,
      status: ImportStatus.COMPLETED,
    });
  }

  async findLatestCompleted(userId: string): Promise<ImportView | null> {
    const row = await this.repository.findOne({
      where: { userId, status: ImportStatus.COMPLETED },
      order: { createdAt: "DESC" },
    });
    return row ? toView(row) : null;
  }

  async list(
    userId: string,
    request: PageRequest,
  ): Promise<Paginated<ImportView>> {
    const [rows, total] = await this.repository.findAndCount({
      where: { userId },
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
