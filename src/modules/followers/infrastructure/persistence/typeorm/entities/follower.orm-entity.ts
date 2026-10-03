import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import { FollowerStatus } from "@/modules/followers/domain/enums/follower-status.enum";

// Current state of every account that has ever followed the user. Keyed by
// (user_id, normalized @username).
@Entity("tb_followers")
@Index("IDX_followers_user_status", ["userId", "status"])
export class FollowerOrmEntity {
  @PrimaryColumn({ name: "idtb_users", type: "uuid" })
  userId!: string;

  @PrimaryColumn({ type: "varchar", length: 64 })
  username!: string;

  @Column({ type: "varchar", length: 16 })
  status!: FollowerStatus;

  @Column({ name: "followed_at", type: "timestamptz", nullable: true })
  followedAt!: Date | null;

  @Column({ name: "first_seen_at", type: "timestamptz" })
  firstSeenAt!: Date;

  @Column({ name: "last_seen_at", type: "timestamptz" })
  lastSeenAt!: Date;

  @Column({ name: "lost_at", type: "timestamptz", nullable: true })
  lostAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
