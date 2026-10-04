import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { UserPlan } from "@/modules/users/domain/enums/user-plan.enum";
import { UserRole } from "@/modules/users/domain/enums/user-role.enum";

// One account per person, created on first Google sign-in. All follower data
// is scoped to this id.
@Entity("tb_users")
export class UserOrmEntity {
  @PrimaryGeneratedColumn("uuid", { name: "idtb_users" })
  id!: string;

  @Column({ name: "google_id", type: "varchar", length: 40 })
  @Index("UQ_users_google_id", { unique: true })
  googleId!: string;

  @Column({ type: "varchar", length: 160 })
  @Index("UQ_users_email", { unique: true })
  email!: string;

  @Column({ type: "varchar", length: 160 })
  name!: string;

  @Column({ name: "picture_url", type: "text", nullable: true })
  pictureUrl!: string | null;

  @Column({ type: "varchar", length: 8, default: UserPlan.FREE })
  plan!: UserPlan;

  @Column({ type: "varchar", length: 8, default: UserRole.USER })
  role!: UserRole;

  // Current legal acceptance (null until the user accepts the latest version).
  @Column({
    name: "terms_version",
    type: "varchar",
    length: 16,
    nullable: true,
  })
  termsVersion!: string | null;

  @Column({ name: "terms_accepted_at", type: "timestamptz", nullable: true })
  termsAcceptedAt!: Date | null;

  @Column({ name: "last_login_at", type: "timestamptz", nullable: true })
  lastLoginAt!: Date | null;

  // Set together when the user asks to delete the account; the row (and, by
  // cascade, all follower data) is removed once the scheduled date passes.
  @Column({
    name: "deletion_requested_at",
    type: "timestamptz",
    nullable: true,
  })
  deletionRequestedAt!: Date | null;

  @Column({
    name: "deletion_scheduled_for",
    type: "timestamptz",
    nullable: true,
  })
  deletionScheduledFor!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
