import { CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

// Which monthly summaries were already e-mailed.
@Entity("tb_monthly_summary_emails")
export class MonthlySummaryEmailOrmEntity {
  @PrimaryColumn({ name: "idtb_profiles", type: "uuid" })
  profileId!: string;

  @PrimaryColumn({ type: "char", length: 7 })
  month!: string;

  @CreateDateColumn({ name: "sent_at", type: "timestamptz" })
  sentAt!: Date;
}
