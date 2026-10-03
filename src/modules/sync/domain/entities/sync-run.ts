import { SyncRunStatus } from "@/modules/sync/domain/enums/sync-run-status.enum";
import type { SyncTrigger } from "@/modules/sync/domain/enums/sync-trigger.enum";

export type SyncRunErrorCode =
  | "SESSION_INVALID"
  | "RATE_LIMITED"
  | "INSTAGRAM_UNAVAILABLE"
  | "TIME_BUDGET"
  | "SNAPSHOT_REJECTED"
  | "ABANDONED"
  | "UNEXPECTED";

export type SyncRunProps = {
  id: string;
  trigger: SyncTrigger;
  status: SyncRunStatus;
  localDate: string;
  igUserId: string | null;
  cursor: string | null;
  pagesFetched: number;
  followersCollected: number;
  invocations: number;
  lostCount: number | null;
  gainedCount: number | null;
  errorCode: SyncRunErrorCode | null;
  errorMessage: string | null;
  startedAt: Date;
  updatedAt: Date;
  finishedAt: Date | null;
};

export class SyncRunInvariantError extends Error {}

// Aggregate for one pass over the follower list. A run can span several
// serverless invocations (RUNNING -> PAUSED -> RUNNING ...) because large
// lists don't fit in a single function timeout; the cursor is the bookmark.
export class SyncRun {
  private constructor(private props: SyncRunProps) {}

  static start(params: {
    id: string;
    trigger: SyncTrigger;
    localDate: string;
    now: Date;
  }): SyncRun {
    return new SyncRun({
      id: params.id,
      trigger: params.trigger,
      status: SyncRunStatus.RUNNING,
      localDate: params.localDate,
      igUserId: null,
      cursor: null,
      pagesFetched: 0,
      followersCollected: 0,
      invocations: 1,
      lostCount: null,
      gainedCount: null,
      errorCode: null,
      errorMessage: null,
      startedAt: params.now,
      updatedAt: params.now,
      finishedAt: null,
    });
  }

  static restore(props: SyncRunProps): SyncRun {
    return new SyncRun({ ...props });
  }

  get id(): string {
    return this.props.id;
  }
  get status(): SyncRunStatus {
    return this.props.status;
  }
  get cursor(): string | null {
    return this.props.cursor;
  }
  get igUserId(): string | null {
    return this.props.igUserId;
  }
  get pagesFetched(): number {
    return this.props.pagesFetched;
  }
  get startedAt(): Date {
    return this.props.startedAt;
  }
  get isFinished(): boolean {
    return (
      this.props.status === SyncRunStatus.COMPLETED ||
      this.props.status === SyncRunStatus.FAILED
    );
  }
  get hasTarget(): boolean {
    return this.props.igUserId !== null;
  }

  resume(now: Date): void {
    if (this.isFinished) {
      throw new SyncRunInvariantError(
        "Execução finalizada não pode ser retomada.",
      );
    }
    this.props.status = SyncRunStatus.RUNNING;
    this.props.invocations += 1;
    this.props.errorCode = null;
    this.props.errorMessage = null;
    this.props.updatedAt = now;
  }

  setTarget(igUserId: string, now: Date): void {
    this.assertRunning();
    this.props.igUserId = igUserId;
    this.props.updatedAt = now;
  }

  recordPage(
    followersInPage: number,
    nextCursor: string | null,
    now: Date,
  ): void {
    this.assertRunning();
    this.props.pagesFetched += 1;
    this.props.followersCollected += followersInPage;
    this.props.cursor = nextCursor;
    this.props.updatedAt = now;
  }

  pause(code: SyncRunErrorCode, message: string, now: Date): void {
    this.assertRunning();
    this.props.status = SyncRunStatus.PAUSED;
    this.props.errorCode = code;
    this.props.errorMessage = message;
    this.props.updatedAt = now;
  }

  complete(result: { lost: number; gained: number }, now: Date): void {
    this.assertRunning();
    this.props.status = SyncRunStatus.COMPLETED;
    this.props.lostCount = result.lost;
    this.props.gainedCount = result.gained;
    this.props.cursor = null;
    this.props.updatedAt = now;
    this.props.finishedAt = now;
  }

  fail(code: SyncRunErrorCode, message: string, now: Date): void {
    if (this.isFinished) return;
    this.props.status = SyncRunStatus.FAILED;
    this.props.errorCode = code;
    this.props.errorMessage = message.slice(0, 500);
    this.props.updatedAt = now;
    this.props.finishedAt = now;
  }

  isStale(now: Date, maxAgeMs: number): boolean {
    return now.getTime() - this.props.startedAt.getTime() > maxAgeMs;
  }

  toPrimitive(): SyncRunProps {
    return { ...this.props };
  }

  private assertRunning(): void {
    if (this.props.status !== SyncRunStatus.RUNNING) {
      throw new SyncRunInvariantError(
        `Operação inválida para execução com status "${this.props.status}".`,
      );
    }
  }
}
