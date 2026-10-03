import { Column, Entity, Index, PrimaryColumn } from "typeorm";
import type { SyncRunErrorCode } from "@/modules/sync/domain/entities/sync-run";
import { SyncRunStatus } from "@/modules/sync/domain/enums/sync-run-status.enum";
import { SyncTrigger } from "@/modules/sync/domain/enums/sync-trigger.enum";

@Entity("tb_sync_runs")
@Index("IDX_sync_runs_local_date", ["localDate"])
@Index("IDX_sync_runs_status_started", ["status", "startedAt"])
export class SyncRunOrmEntity {
  @PrimaryColumn("uuid", { name: "idtb_sync_runs" })
  id!: string;

  @Column({ type: "varchar", length: 16 })
  trigger!: SyncTrigger;

  @Column({ type: "varchar", length: 16 })
  status!: SyncRunStatus;

  @Column({ name: "local_date", type: "date" })
  localDate!: string;

  @Column({ name: "ig_user_id", type: "varchar", length: 32, nullable: true })
  igUserId!: string | null;

  @Column({ type: "text", nullable: true })
  cursor!: string | null;

  @Column({ name: "pages_fetched", type: "int", default: 0 })
  pagesFetched!: number;

  @Column({ name: "followers_collected", type: "int", default: 0 })
  followersCollected!: number;

  @Column({ type: "int", default: 1 })
  invocations!: number;

  @Column({ name: "lost_count", type: "int", nullable: true })
  lostCount!: number | null;

  @Column({ name: "gained_count", type: "int", nullable: true })
  gainedCount!: number | null;

  @Column({ name: "error_code", type: "varchar", length: 32, nullable: true })
  errorCode!: SyncRunErrorCode | null;

  @Column({
    name: "error_message",
    type: "varchar",
    length: 500,
    nullable: true,
  })
  errorMessage!: string | null;

  @Column({ name: "started_at", type: "timestamptz" })
  startedAt!: Date;

  @Column({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @Column({ name: "finished_at", type: "timestamptz", nullable: true })
  finishedAt!: Date | null;
}
