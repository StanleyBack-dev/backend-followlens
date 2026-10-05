export interface SummaryEmailLogPort {
  /**
   * Claims the (profile, month) pair. Returns false when it was already
   * claimed, which is what keeps a repeated cron run from e-mailing twice.
   */
  claim(profileId: string, month: string): Promise<boolean>;
  release(profileId: string, month: string): Promise<void>;
}

export const SUMMARY_EMAIL_LOG = Symbol("SUMMARY_EMAIL_LOG");
