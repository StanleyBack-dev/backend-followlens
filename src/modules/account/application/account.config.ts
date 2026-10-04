import type { ConfigService } from "@nestjs/config";

export type AccountSettings = {
  /** Days between a deletion request and the actual removal. */
  deletionGraceDays: number;
};

export const ACCOUNT_SETTINGS = Symbol("ACCOUNT_SETTINGS");

export function accountSettingsFactory(config: ConfigService): AccountSettings {
  return {
    deletionGraceDays: config.get<number>("ACCOUNT_DELETION_GRACE_DAYS") ?? 7,
  };
}
