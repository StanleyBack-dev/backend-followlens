import { Inject, Injectable } from "@nestjs/common";
import {
  IMPORT_REPOSITORY,
  type ImportRepositoryPort,
  type ImportView,
} from "@/modules/imports/application/ports/import-repository.port";
import type { PageRequest, Paginated } from "@/shared/application/pagination";

@Injectable()
export class ListImportsUseCase {
  constructor(
    @Inject(IMPORT_REPOSITORY) private readonly imports: ImportRepositoryPort,
  ) {}

  execute(
    profileId: string,
    request: PageRequest,
  ): Promise<Paginated<ImportView>> {
    return this.imports.list(profileId, request);
  }
}
