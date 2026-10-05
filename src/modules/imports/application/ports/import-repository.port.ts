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
  profileId: string;
  localDate: string;
};

/** A completed import, as far as streaks and summaries care. */
export type CompletedImport = {
  createdAt: Date;
  /** Calendar date in the app timezone. */
  localDate: string;
  followersCount: number | null;
};

export interface ImportRepositoryPort {
  record(input: RecordImportInput): Promise<ImportView>;
  countCompletedOn(profileId: string, localDate: string): Promise<number>;
  findLatestCompleted(profileId: string): Promise<ImportView | null>;
  /**
   * When the latest import that counts against the Free interval finished
   * (completed and not the baseline), or null when there is none.
   */
  findLastComparisonAt(profileId: string): Promise<Date | null>;
  list(profileId: string, request: PageRequest): Promise<Paginated<ImportView>>;
  /** Oldest first. */
  listCompleted(profileId: string): Promise<CompletedImport[]>;
  /** Profiles with at least one completed import in [from, to). */
  listProfilesWithImportsBetween(from: Date, to: Date): Promise<string[]>;
}

export const IMPORT_REPOSITORY = Symbol("IMPORT_REPOSITORY");
