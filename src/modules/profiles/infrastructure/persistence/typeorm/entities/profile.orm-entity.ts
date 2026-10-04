import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

// An Instagram profile a user tracks. All follower data (followers, events,
// imports) belongs to a profile, and goes away with it.
@Entity("tb_profiles")
@Index("IDX_profiles_user_created", ["userId", "createdAt"])
export class ProfileOrmEntity {
  @PrimaryGeneratedColumn("uuid", { name: "idtb_profiles" })
  id!: string;

  @Column({ name: "idtb_users", type: "uuid" })
  userId!: string;

  @Column({ type: "varchar", length: 40 })
  name!: string;

  // The profile every account starts with; it can be renamed but not removed.
  @Column({ name: "is_default", type: "boolean", default: false })
  isDefault!: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
