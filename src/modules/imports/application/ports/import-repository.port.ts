import type { ImportStatus } from "@/modules/imports/domain/enums/import-status.enum";
import type { PageRequest, Paginated } from "@/shared/application/pagination";

export type ImportView = {
  id: string;
  status: ImportStatus;
  filename: string | null;
  followersCount: number | null;
  baseline: boolean;
  lostCount: number | null;
  gainedCount: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date;
};

export type RecordImportInput = Omit<ImportView, "id"> & {
  userId: string;
  localDate: string;
};

export interface ImportRepositoryPort {
  record(input: RecordImportInput): Promise<ImportView>;
  countCompletedOn(userId: string, localDate: string): Promise<number>;
  findLatestCompleted(userId: string): Promise<ImportView | null>;
  list(userId: string, request: PageRequest): Promise<Paginated<ImportView>>;
}

export const IMPORT_REPOSITORY = Symbol("IMPORT_REPOSITORY");
