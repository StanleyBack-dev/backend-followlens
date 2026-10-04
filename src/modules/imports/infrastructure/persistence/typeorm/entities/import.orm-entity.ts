import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { ImportStatus } from "@/modules/imports/domain/enums/import-status.enum";

// One record per upload processed (or rejected). Drives the daily limit and
// the history shown in the panel.
@Entity("tb_imports")
@Index("IDX_imports_profile_local_date", ["profileId", "localDate"])
@Index("IDX_imports_profile_created", ["profileId", "createdAt"])
export class ImportOrmEntity {
  @PrimaryGeneratedColumn("uuid", { name: "idtb_imports" })
  id!: string;

  @Column({ name: "idtb_profiles", type: "uuid" })
  profileId!: string;

  @Column({ type: "varchar", length: 16 })
  status!: ImportStatus;

  @Column({ type: "varchar", length: 160, nullable: true })
  filename!: string | null;

  @Column({ name: "followers_count", type: "int", nullable: true })
  followersCount!: number | null;

  @Column({ type: "boolean", default: false })
  baseline!: boolean;

  @Column({ name: "lost_count", type: "int", nullable: true })
  lostCount!: number | null;

  @Column({ name: "gained_count", type: "int", nullable: true })
  gainedCount!: number | null;

  @Column({ name: "error_code", type: "varchar", length: 48, nullable: true })
  errorCode!: string | null;

  @Column({
    name: "error_message",
    type: "varchar",
    length: 500,
    nullable: true,
  })
  errorMessage!: string | null;

  @Column({ name: "local_date", type: "date" })
  localDate!: string;

  @Column({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
