import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";
import type { RewardApplication } from "@/modules/referrals/application/ports/referral-reward-repository.port";

// One row per referred user whose first payment earned the referrer Pro days.
@Entity("tb_referral_rewards")
export class ReferralRewardOrmEntity {
  @PrimaryGeneratedColumn("uuid", { name: "idtb_referral_rewards" })
  id!: string;

  @Column({ name: "idtb_users", type: "uuid" })
  @Index("IDX_referral_rewards_user")
  referrerId!: string;

  @Column({ name: "referred_user_id", type: "uuid" })
  @Index("UQ_referral_rewards_referred", { unique: true })
  referredUserId!: string;

  @Column({ type: "int" })
  days!: number;

  @Column({ name: "applied_as", type: "varchar", length: 24 })
  appliedAs!: RewardApplication;

  @Column({ name: "revoked_at", type: "timestamptz", nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
