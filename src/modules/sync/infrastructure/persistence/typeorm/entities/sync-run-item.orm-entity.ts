import { Entity, PrimaryColumn } from "typeorm";

// Staging area: followers collected by a run that may span several
// invocations. Cleared once the run completes or fails.
@Entity("tb_sync_run_items")
export class SyncRunItemOrmEntity {
  @PrimaryColumn("uuid", { name: "idtb_sync_runs" })
  syncRunId!: string;

  @PrimaryColumn({ type: "varchar", length: 64 })
  username!: string;
}
