import type { ConfigService } from "@nestjs/config";

export type ImportSettings = {
  dailyLimit: number;
  maxFileBytes: number;
  /** Cap on the TOTAL uncompressed bytes read from a .zip (zip-bomb guard). */
  maxUnzippedBytes: number;
  /** Cap on how many JSON entries a .zip may contain. */
  maxZipEntries: number;
};

export const IMPORT_SETTINGS = Symbol("IMPORT_SETTINGS");

export function importSettingsFactory(config: ConfigService): ImportSettings {
  return {
    dailyLimit: config.get<number>("IMPORT_DAILY_LIMIT") ?? 10,
    maxFileBytes: (config.get<number>("IMPORT_MAX_FILE_MB") ?? 4) * 1024 * 1024,
    maxUnzippedBytes:
      (config.get<number>("IMPORT_MAX_UNZIPPED_MB") ?? 64) * 1024 * 1024,
    maxZipEntries: config.get<number>("IMPORT_MAX_ZIP_ENTRIES") ?? 64,
  };
}
