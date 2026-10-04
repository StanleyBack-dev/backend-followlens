import type { AppErrorDefinition } from "@/common/exceptions/app-error-definition.type";
import { accountErrors } from "@/common/exceptions/catalogs/account-errors.catalog";
import { authErrors } from "@/common/exceptions/catalogs/auth-errors.catalog";
import { billingErrors } from "@/common/exceptions/catalogs/billing-errors.catalog";
import { followersErrors } from "@/common/exceptions/catalogs/followers-errors.catalog";
import { importsErrors } from "@/common/exceptions/catalogs/imports-errors.catalog";
import { mailsErrors } from "@/common/exceptions/catalogs/mails-errors.catalog";
import { profilesErrors } from "@/common/exceptions/catalogs/profiles-errors.catalog";
import { syncErrors } from "@/common/exceptions/catalogs/sync-errors.catalog";

export const APP_ERRORS = {
  account: accountErrors,
  auth: authErrors,
  billing: billingErrors,
  followers: followersErrors,
  imports: importsErrors,
  mails: mailsErrors,
  profiles: profilesErrors,
  sync: syncErrors,
} as const satisfies Record<string, Record<string, AppErrorDefinition<never>>>;
