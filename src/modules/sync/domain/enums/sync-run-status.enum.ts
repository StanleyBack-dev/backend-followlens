export enum SyncRunStatus {
  RUNNING = "running",
  /** Ran out of time budget or got rate limited; resumes from the cursor. */
  PAUSED = "paused",
  COMPLETED = "completed",
  FAILED = "failed",
}
