import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";
import {
  type SupportCategory,
  SupportTicketStatus,
} from "@/modules/support/domain/support.enums";

// A support ticket: the user's message plus the team's single reply.
@Entity("tb_support_messages")
@Index("IDX_support_messages_user_created", ["userId", "createdAt"])
@Index("IDX_support_messages_status_created", ["status", "createdAt"])
export class SupportMessageOrmEntity {
  @PrimaryGeneratedColumn("uuid", { name: "idtb_support_messages" })
  id!: string;

  @Column({ name: "idtb_users", type: "uuid" })
  userId!: string;

  // Assigned by the database (identity column); never written by the app.
  @Column({
    name: "protocol_number",
    type: "int",
    insert: false,
    update: false,
  })
  protocolNumber!: number;

  @Column({ type: "varchar", length: 24 })
  category!: SupportCategory;

  @Column({ type: "varchar", length: 2000 })
  message!: string;

  @Column({ type: "varchar", length: 12, default: SupportTicketStatus.OPEN })
  status!: SupportTicketStatus;

  @Column({
    name: "admin_reply",
    type: "varchar",
    length: 2000,
    nullable: true,
  })
  adminReply!: string | null;

  @Column({ name: "replied_at", type: "timestamptz", nullable: true })
  repliedAt!: Date | null;

  @Column({ name: "replied_by_admin_id", type: "uuid", nullable: true })
  repliedByAdminId!: string | null;

  @Column({ name: "finalized_at", type: "timestamptz", nullable: true })
  finalizedAt!: Date | null;

  @Column({ name: "finalized_by_admin_id", type: "uuid", nullable: true })
  finalizedByAdminId!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
