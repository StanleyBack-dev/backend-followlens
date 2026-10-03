export enum SyncTrigger {
  /** Owner clicked "Sincronizar agora" in the panel. */
  MANUAL = "manual",
  /** Daily Vercel cron. */
  CRON = "cron",
}
