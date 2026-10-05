import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

// One opening of a referral link. Anonymous on purpose: nothing about the
// visitor is stored.
@Entity("tb_referral_clicks")
@Index("IDX_referral_clicks_user_clicked", ["referrerId", "clickedAt"])
export class ReferralClickOrmEntity {
  @PrimaryGeneratedColumn("uuid", { name: "idtb_referral_clicks" })
  id!: string;

  @Column({ name: "idtb_users", type: "uuid" })
  referrerId!: string;

  @Column({ name: "clicked_at", type: "timestamptz" })
  clickedAt!: Date;
}
