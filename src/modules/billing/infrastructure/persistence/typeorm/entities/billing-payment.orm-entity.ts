import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { BillingPaymentStatus } from "@/modules/billing/domain/enums/billing-payment-status.enum";

// Mirror of each gateway charge, kept in sync by the webhook.
@Entity("tb_billing_payments")
@Index("IDX_billing_payments_user_created", ["userId", "createdAt"])
export class BillingPaymentOrmEntity {
  @PrimaryGeneratedColumn("uuid", { name: "idtb_billing_payments" })
  id!: string;

  @Column({ name: "idtb_users", type: "uuid" })
  userId!: string;

  @Column({ name: "gateway_payment_id", type: "varchar", length: 64 })
  @Index("UQ_billing_payments_gateway", { unique: true })
  gatewayPaymentId!: string;

  // Postgres numeric comes back as a string.
  @Column({ type: "numeric", precision: 12, scale: 2 })
  amount!: string;

  @Column({
    type: "varchar",
    length: 16,
    default: BillingPaymentStatus.PENDING,
  })
  status!: BillingPaymentStatus;

  @Column({ name: "due_date", type: "date", nullable: true })
  dueDate!: string | null;

  @Column({ name: "paid_at", type: "timestamptz", nullable: true })
  paidAt!: Date | null;

  @Column({ name: "invoice_url", type: "text", nullable: true })
  invoiceUrl!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
